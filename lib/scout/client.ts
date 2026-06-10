/**
 * Scout model client — OpenRouter (OpenAI chat-completions protocol) via fetch.
 *
 * One key, two tiers (decision 7.5):
 *  - dev/pipeline default: free Nemotron (tool calling verified)
 *  - production main loop: Claude Sonnet, switched by env, same protocol
 *
 * Every call is metered into api_usage (decision T12 groundwork). The daily
 * per-workspace budget is enforced here so no caller can forget it.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { ChatMessage, ToolCall, ToolDef, Usage } from './types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

export const SCOUT_MODEL = process.env.SCOUT_MODEL || 'deepseek-chat'
export const DAILY_BUDGET_USD = Number(process.env.SCOUT_DAILY_BUDGET_USD || '3')

/** USD per 1M tokens [input, output]; unknown/free models meter at 0. */
const PRICE_TABLE: Record<string, [number, number]> = {
  'anthropic/claude-sonnet-4.6': [3, 15],
  'anthropic/claude-haiku-4.5': [1, 5],
  'deepseek-chat': [0.28, 0.42],
  'deepseek-reasoner': [0.28, 0.42],
}

/** Same OpenAI wire protocol everywhere; the model id picks the provider. */
function providerFor(model: string): { url: string; apiKey: string | undefined; provider: string } {
  if (model.startsWith('deepseek')) {
    return { url: DEEPSEEK_URL, apiKey: process.env.DEEPSEEK_API_KEY, provider: 'deepseek' }
  }
  return { url: OPENROUTER_URL, apiKey: process.env.OPENROUTER_API_KEY, provider: 'openrouter' }
}

export class ScoutBudgetError extends Error {
  constructor(spent: number) {
    super(`Daily budget reached ($${spent.toFixed(2)} of $${DAILY_BUDGET_USD})`)
    this.name = 'ScoutBudgetError'
  }
}

export function costUsd(model: string, promptTokens: number, completionTokens: number): number {
  const price = PRICE_TABLE[model.replace(/:free$/, '')]
  if (!price || model.endsWith(':free')) return 0
  return (promptTokens * price[0] + completionTokens * price[1]) / 1_000_000
}

export async function spentTodayUsd(workspaceId: string): Promise<number> {
  const admin = createAdminClient()
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  const { data } = await admin
    .from('api_usage')
    .select('cost_usd')
    .eq('workspace_id', workspaceId)
    .gte('created_at', since.toISOString())
  return (data || []).reduce((sum, r) => sum + Number(r.cost_usd || 0), 0)
}

export async function assertBudget(workspaceId: string): Promise<void> {
  const spent = await spentTodayUsd(workspaceId)
  if (spent >= DAILY_BUDGET_USD) throw new ScoutBudgetError(spent)
}

async function recordUsage(workspaceId: string | null, model: string, kind: string, usage: Usage, provider = 'openrouter'): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('api_usage').insert({
      workspace_id: workspaceId,
      provider,
      model,
      kind,
      tokens_in: usage.promptTokens,
      tokens_out: usage.completionTokens,
      cost_usd: usage.costUsd,
    })
  } catch (e) {
    console.error('[scout] recordUsage failed:', (e as Error).message)
  }
}

export interface ChatStreamInput {
  messages: ChatMessage[]
  tools?: ToolDef[]
  model?: string
  maxTokens?: number
  temperature?: number
  workspaceId?: string | null
  /** Metering label, e.g. 'chat' | 'onboarding' | 'docgen'. */
  kind?: string
  onDelta?: (text: string) => void
  signal?: AbortSignal
  /** Test seam — defaults to global fetch. */
  fetchImpl?: typeof fetch
  /** Test seam — skip DB metering. */
  meter?: boolean
  /** Default true. Structured (forced-tool) calls set false: plain JSON
   * response, no SSE parsing surface at all. */
  stream?: boolean
}

export interface ChatStreamResult {
  content: string
  toolCalls: ToolCall[]
  finishReason: string | null
  usage: Usage
}

interface RawToolCallDelta {
  index?: number
  id?: string
  function?: { name?: string; arguments?: string }
}

/**
 * Streaming chat completion. Accumulates text deltas (forwarded to onDelta)
 * and tool-call fragments (merged by index) into a final result.
 */
export async function chatStream(input: ChatStreamInput): Promise<ChatStreamResult> {
  const model = input.model || SCOUT_MODEL
  const { url, apiKey, provider } = providerFor(model)
  if (!apiKey) throw new Error(`Missing API key for provider ${provider}`)
  const doFetch = input.fetchImpl || fetch

  const res = await doFetch(url, {
    method: 'POST',
    signal: input.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://growthhunt.app',
      'X-Title': 'Scout',
    },
    body: JSON.stringify({
      model,
      messages: input.messages.map(m => ({
        role: m.role,
        content: m.content,
        tool_call_id: m.tool_call_id,
        tool_calls: m.tool_calls?.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments },
        })),
      })),
      tools: input.tools?.length
        ? input.tools.map(t => ({ type: 'function', function: t }))
        : undefined,
      max_tokens: input.maxTokens ?? 2000,
      temperature: input.temperature ?? 0.3,
      stream: input.stream !== false,
      ...(input.stream !== false ? { stream_options: { include_usage: true } } : {}),
    }),
  })

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '')
    throw new Error(`${provider} ${res.status}: ${body.slice(0, 300)}`)
  }

  if (input.stream === false) {
    const data = await res.json() as Record<string, unknown>
    const choice = (data.choices as Array<Record<string, unknown>> | undefined)?.[0]
    const msg = (choice?.message ?? {}) as {
      content?: string | null
      tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }>
    }
    const u = (data.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number }
    const usage: Usage = {
      promptTokens: u.prompt_tokens ?? 0,
      completionTokens: u.completion_tokens ?? 0,
      costUsd: costUsd(model, u.prompt_tokens ?? 0, u.completion_tokens ?? 0),
    }
    if (input.meter !== false) {
      await recordUsage(input.workspaceId ?? null, model, input.kind || 'chat', usage, provider)
    }
    const content = msg.content || ''
    if (content) input.onDelta?.(content)
    return {
      content,
      toolCalls: (msg.tool_calls || []).map(tc => ({
        id: tc.id || '',
        name: tc.function?.name || '',
        arguments: tc.function?.arguments || '',
      })),
      finishReason: (choice?.finish_reason as string) ?? null,
      usage,
    }
  }

  let content = ''
  let finishReason: string | null = null
  let promptTokens = 0
  let completionTokens = 0
  const toolParts = new Map<number, { id: string; name: string; arguments: string }>()

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (process.env.SCOUT_DEBUG_RAW && trimmed) console.error('[raw]', trimmed.slice(0, 400))
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let chunk: Record<string, unknown>
      try {
        chunk = JSON.parse(payload)
      } catch {
        continue
      }
      // OpenRouter reports provider failures as an in-stream error chunk after the 200.
      const streamError = chunk.error as { message?: string; code?: number } | undefined
      if (streamError) {
        throw new Error(`OpenRouter stream error${streamError.code ? ` ${streamError.code}` : ''}: ${streamError.message || 'unknown'}`)
      }
      const usage = chunk.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined
      if (usage) {
        promptTokens = usage.prompt_tokens ?? promptTokens
        completionTokens = usage.completion_tokens ?? completionTokens
      }
      const choice = (chunk.choices as Array<Record<string, unknown>> | undefined)?.[0]
      if (!choice) continue
      if (choice.finish_reason) finishReason = choice.finish_reason as string
      const delta = choice.delta as { content?: string; tool_calls?: RawToolCallDelta[] } | undefined
      if (!delta) continue
      if (delta.content) {
        content += delta.content
        input.onDelta?.(delta.content)
      }
      for (const tc of delta.tool_calls || []) {
        const idx = tc.index ?? 0
        const part = toolParts.get(idx) || { id: '', name: '', arguments: '' }
        if (tc.id) part.id = tc.id
        if (tc.function?.name) part.name = tc.function.name
        if (tc.function?.arguments) part.arguments += tc.function.arguments
        toolParts.set(idx, part)
      }
    }
  }

  const usage: Usage = {
    promptTokens,
    completionTokens,
    costUsd: costUsd(model, promptTokens, completionTokens),
  }
  if (input.meter !== false) {
    await recordUsage(input.workspaceId ?? null, model, input.kind || 'chat', usage, provider)
  }

  const toolCalls: ToolCall[] = [...toolParts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, p]) => ({ id: p.id, name: p.name, arguments: p.arguments }))

  return { content, toolCalls, finishReason, usage }
}
