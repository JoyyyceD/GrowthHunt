import { describe, expect, test } from 'bun:test'
import { chatStream } from './client'
import { runScoutTurn, type ScoutIO } from './loop'
import { ScoutBudgetError } from './client'
import type { ChatStreamResult, ChatStreamInput } from './client'
import type { ScoutEvent, ScoutTool } from './types'

function sseResponse(events: unknown[]): Response {
  const body = events.map(e => `data: ${JSON.stringify(e)}\n`).join('\n') + '\ndata: [DONE]\n'
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

const noopIO = {
  assertBudget: async () => {},
  buildContext: async () => 'Workspace: Test (test.com)',
  persistStep: async () => {},
}

function fakeTool(run: ScoutTool['run']): ScoutTool & { available: boolean } {
  return {
    available: true,
    def: { name: 'fake', description: 'fake', parameters: { type: 'object', properties: {}, required: [] } },
    label: () => 'Working…',
    run,
  }
}

describe('chatStream', () => {
  test('accumulates text deltas and usage', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    const deltas: string[] = []
    const result = await chatStream({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'mock/test-model',
      meter: false,
      onDelta: t => deltas.push(t),
      fetchImpl: async () =>
        sseResponse([
          { choices: [{ delta: { content: 'Hel' } }] },
          { choices: [{ delta: { content: 'lo' }, finish_reason: 'stop' }] },
          { usage: { prompt_tokens: 10, completion_tokens: 2 }, choices: [] },
        ]),
    })
    expect(result.content).toBe('Hello')
    expect(deltas.join('')).toBe('Hello')
    expect(result.finishReason).toBe('stop')
    expect(result.usage.promptTokens).toBe(10)
    expect(result.toolCalls).toHaveLength(0)
  })

  test('merges fragmented tool-call deltas by index', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    const result = await chatStream({
      messages: [{ role: 'user', content: 'search' }],
      model: 'mock/test-model',
      meter: false,
      fetchImpl: async () =>
        sseResponse([
          { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'web_search', arguments: '{"q":' } }] } }] },
          { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"pricing"}' } }] }, finish_reason: 'tool_calls' }] },
        ]),
    })
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0].id).toBe('call_1')
    expect(result.toolCalls[0].name).toBe('web_search')
    expect(JSON.parse(result.toolCalls[0].arguments)).toEqual({ q: 'pricing' })
  })

  test('throws on non-200 with body excerpt', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    await expect(
      chatStream({
        messages: [{ role: 'user', content: 'hi' }],
        model: 'mock/test-model',
        meter: false,
        fetchImpl: async () => new Response('rate limited', { status: 429 }),
      }),
    ).rejects.toThrow('openrouter 429')
  })
})

describe('runScoutTurn', () => {
  test('tool call round then final answer', async () => {
    const calls: ChatStreamInput[] = []
    const responses: ChatStreamResult[] = [
      {
        content: '',
        toolCalls: [{ id: 'c1', name: 'fake', arguments: '{"q":"x"}' }],
        finishReason: 'tool_calls',
        usage: { promptTokens: 100, completionTokens: 10, costUsd: 0 },
      },
      {
        content: 'Here is your answer.',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 150, completionTokens: 20, costUsd: 0 },
      },
    ]
    const events: ScoutEvent[] = []
    const result = await runScoutTurn({
      workspaceId: 'ws1',
      userMessage: 'do the thing',
      emit: e => events.push(e),
      io: {
        ...noopIO,
        chat: async input => {
          calls.push(input)
          return responses.shift()!
        },
        tools: { fake: fakeTool(async params => `result for ${params.q}`) },
      },
    })

    expect(result.endedWith).toBe('final_answer')
    expect(result.reply).toBe('Here is your answer.')
    expect(result.steps.map(s => s.actionKind)).toEqual(['tool_call', 'final_answer'])
    // second model call must carry the tool observation back
    const toolMsg = calls[1].messages.find(m => m.role === 'tool')
    expect(toolMsg?.content).toBe('result for x')
    expect(toolMsg?.tool_call_id).toBe('c1')
    // step events bracket the tool run
    const stepEvents = events.filter(e => e.type === 'step')
    expect(stepEvents.map(e => (e as { status: string }).status)).toEqual(['start', 'done'])
    expect(events.at(-1)?.type).toBe('done')
  })

  test('tool error becomes observation and loop continues', async () => {
    const responses: ChatStreamResult[] = [
      {
        content: '',
        toolCalls: [{ id: 'c1', name: 'fake', arguments: '{}' }],
        finishReason: 'tool_calls',
        usage: { promptTokens: 1, completionTokens: 1, costUsd: 0 },
      },
      {
        content: 'Recovered gracefully.',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 1, completionTokens: 1, costUsd: 0 },
      },
    ]
    const seenByModel: ChatStreamInput[] = []
    const events: ScoutEvent[] = []
    const result = await runScoutTurn({
      workspaceId: 'ws1',
      userMessage: 'boom',
      emit: e => events.push(e),
      io: {
        ...noopIO,
        chat: async input => {
          seenByModel.push(input)
          return responses.shift()!
        },
        tools: { fake: fakeTool(async () => { throw new Error('serper down') }) },
      },
    })
    expect(result.endedWith).toBe('final_answer')
    const toolMsg = seenByModel[1].messages.find(m => m.role === 'tool')
    expect(toolMsg?.content).toContain('Error: serper down')
    const errStep = events.find(e => e.type === 'step' && (e as { status: string }).status === 'error')
    expect(errStep).toBeDefined()
  })

  test('budget exceeded ends turn politely without model calls', async () => {
    let modelCalled = false
    const events: ScoutEvent[] = []
    const result = await runScoutTurn({
      workspaceId: 'ws1',
      userMessage: 'hi',
      emit: e => events.push(e),
      io: {
        ...noopIO,
        assertBudget: async () => { throw new ScoutBudgetError(3.2) },
        chat: async () => { modelCalled = true; throw new Error('should not be called') },
        tools: {},
      },
    })
    expect(modelCalled).toBe(false)
    expect(result.endedWith).toBe('budget')
    expect(result.reply).toContain('budget')
    expect(events.at(-1)?.type).toBe('done')
  })

  test('ask_user tool ends the turn', async () => {
    const events: ScoutEvent[] = []
    const askTool: ScoutTool & { available: boolean } = {
      available: true,
      def: { name: 'ask_user', description: '', parameters: { type: 'object', properties: {}, required: [] } },
      label: () => 'Asking you…',
      run: async (params, ctx) => {
        ctx.emit({ type: 'ask_user', question: String(params.question) })
        return 'ASK_USER_SENT'
      },
    }
    const result = await runScoutTurn({
      workspaceId: 'ws1',
      userMessage: 'should I?',
      emit: e => events.push(e),
      io: {
        ...noopIO,
        chat: async () => ({
          content: 'Quick question first.',
          toolCalls: [{ id: 'c1', name: 'ask_user', arguments: '{"question":"X or Y?"}' }],
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, costUsd: 0 },
        }),
        tools: { ask_user: askTool },
      },
    })
    expect(result.endedWith).toBe('ask_user')
    expect(events.some(e => e.type === 'ask_user')).toBe(true)
  })

  test('max steps reached returns continuation message', async () => {
    const result = await runScoutTurn({
      workspaceId: 'ws1',
      userMessage: 'loop forever',
      io: {
        ...noopIO,
        chat: async () => ({
          content: '',
          toolCalls: [{ id: 'c', name: 'fake', arguments: '{}' }],
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, costUsd: 0 },
        }),
        tools: { fake: fakeTool(async () => 'ok') },
      },
    })
    expect(result.endedWith).toBe('max_steps')
    expect(result.steps.filter(s => s.actionKind === 'tool_call')).toHaveLength(5)
  })
})
