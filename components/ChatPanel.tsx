'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { GtmMessage, GtmConversation } from '@/lib/orchestrator/types'
import type { StepTrace } from '@/lib/orchestrator/loop'
import type { Workspace } from '@/lib/workspace/types'

interface ApprovalRequest {
  tool: string
  params: unknown
  reason: string
}

interface PreambleEvent {
  conversation_id: string
  message_id: string
  content: string
  needs_tools: boolean
  created_at: string
}

interface FinalEvent {
  conversation_id: string
  assistant: GtmMessage
  preamble: GtmMessage | null
  route_to?: string
  followups?: string[]
  task_id?: string
  tool_used?: string
  steps?: StepTrace[]
  approval_request?: ApprovalRequest
}

interface ApproveResponse {
  conversation_id?: string
  assistant?: GtmMessage | { content?: string }
  route_to?: string
  followups?: string[]
  task_id?: string
  tool_used?: string
  steps?: StepTrace[]
}

interface PendingApproval extends ApprovalRequest {
  messageId: string
}

interface ChatPanelProps {
  workspace: Workspace
  initialConversation?: GtmConversation | null
  initialMessages?: GtmMessage[]
  /** When true (used by FloatingChat) the panel is compact + collapsible. */
  compact?: boolean
  onClose?: () => void
}

const SUGGESTIONS = [
  'Audit my page for AI citations',
  'What\'s my current ICP?',
  'Find 6 creators to DM',
  'Run weekly review',
]

export function ChatPanel({ workspace, initialConversation, initialMessages = [], compact, onClose }: ChatPanelProps) {
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string | null>(initialConversation?.id ?? null)
  const [messages, setMessages] = useState<GtmMessage[]>(initialMessages)
  const [traces, setTraces] = useState<Record<string, StepTrace[]>>({})
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<'idle' | 'streaming' | 'working'>('idle')
  const [stage, setStage] = useState<string>('')
  const [followups, setFollowups] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, phase, pendingApproval, traces, stage])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || phase !== 'idle') return
    setInput('')
    setFollowups([])
    setPendingApproval(null)
    setPhase('streaming')
    setStage('thinking…')
    const tempUser: GtmMessage = {
      id: 'temp-' + Date.now(),
      conversation_id: conversationId ?? 'pending',
      role: 'user',
      content: trimmed,
      tool_call: null,
      task_id: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUser])

    let preambleId: string | null = null
    let liveSteps: StepTrace[] = []

    try {
      const res = await fetch('/api/gtm/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          conversation_id: conversationId ?? undefined,
          message: trimmed,
        }),
      })
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '')
        let errMsg = `Chat failed (${res.status})`
        try { const j = JSON.parse(errText); if (j.error) errMsg = j.error } catch { /* noop */ }
        toast.error(errMsg)
        setMessages((prev) => prev.filter((m) => m.id !== tempUser.id))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let saw: 'preamble' | 'step' | 'final' | 'error' | null = null

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        let sepIdx: number
        while ((sepIdx = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, sepIdx)
          buf = buf.slice(sepIdx + 2)
          let event = 'message'
          const dataLines: string[] = []
          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7).trim()
            else if (line.startsWith('data: ')) dataLines.push(line.slice(6))
          }
          const data = dataLines.join('\n')
          if (!data) continue
          let parsed: unknown
          try { parsed = JSON.parse(data) } catch { continue }

          if (event === 'preamble') {
            const p = parsed as PreambleEvent
            saw = 'preamble'
            setConversationId(p.conversation_id)
            const preambleMsg: GtmMessage = {
              id: p.message_id,
              conversation_id: p.conversation_id,
              role: 'assistant',
              content: p.content,
              tool_call: { name: p.needs_tools ? 'preamble' : 'chat' },
              task_id: null,
              created_at: p.created_at || new Date().toISOString(),
            }
            preambleId = preambleMsg.id
            setMessages((prev) => {
              const withoutTemp = prev.filter((m) => m.id !== tempUser.id)
              const userPersisted: GtmMessage = { ...tempUser, conversation_id: p.conversation_id }
              return [...withoutTemp, userPersisted, preambleMsg]
            })
            if (p.needs_tools) {
              setStage('working…')
              setPhase('working')
            } else {
              setStage('')
            }
          } else if (event === 'step') {
            saw = 'step'
            const step = parsed as StepTrace
            liveSteps = [...liveSteps, step]
            const targetId = preambleId
            if (targetId) {
              const snapshot = [...liveSteps]
              setTraces((prev) => ({ ...prev, [targetId]: snapshot }))
            }
            // Stage label per step kind
            if (step.action_kind === 'tool_call' && step.tool_name) {
              setStage(`running ${step.tool_name}…`)
            } else if (step.action_kind === 'approval_request') {
              setStage('awaiting approval…')
            } else if (step.action_kind === 'final_answer') {
              setStage('wrapping up…')
            }
          } else if (event === 'final') {
            saw = 'final'
            const ok = parsed as FinalEvent
            setConversationId(ok.conversation_id)
            // Append synthesis only when it's a separate message from the preamble.
            if (ok.assistant && ok.assistant.id !== preambleId) {
              const finalMsg = ok.assistant
              setMessages((prev) => {
                // Slash path never had a preamble event; ensure tempUser is replaced.
                const withoutTemp = prev.filter((m) => m.id !== tempUser.id)
                if (!preambleId) {
                  const userPersisted: GtmMessage = { ...tempUser, conversation_id: ok.conversation_id }
                  return [...withoutTemp, userPersisted, finalMsg]
                }
                return [...withoutTemp, finalMsg]
              })
            }
            // Trace lands on the preamble (the "work" bubble) when it exists,
            // else on the assistant (slash path).
            if (ok.steps && ok.steps.length > 0) {
              const finalSteps = ok.steps
              const traceTarget = preambleId || ok.assistant?.id
              if (traceTarget) setTraces((prev) => ({ ...prev, [traceTarget]: finalSteps }))
            }
            if (ok.approval_request && ok.assistant) {
              setPendingApproval({ ...ok.approval_request, messageId: ok.assistant.id })
            }
            setFollowups(ok.followups ?? [])
            if (ok.tool_used && ok.tool_used !== 'approval_request' && ok.tool_used !== 'chat') {
              toast.success(`Tool: ${ok.tool_used}`, { duration: 1800 })
            }
            if (ok.route_to) {
              setTimeout(() => router.push(ok.route_to!), 700)
            }
          } else if (event === 'error') {
            saw = 'error'
            const e = parsed as { error?: string }
            toast.error(e.error || 'Stream error')
            setMessages((prev) => prev.filter((m) => m.id !== tempUser.id && m.id !== preambleId))
          }
        }
      }

      if (saw === null) {
        toast.error('Empty response from chat stream')
        setMessages((prev) => prev.filter((m) => m.id !== tempUser.id))
      }
    } catch (err) {
      toast.error((err as Error).message)
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id))
    } finally {
      setPhase('idle')
      setStage('')
    }
  }

  async function decide(approved: boolean) {
    if (!pendingApproval || !conversationId || phase !== 'idle') return
    setPhase('streaming')
    setStage(approved ? 'running approved tool…' : 'denying…')
    try {
      const res = await fetch('/api/gtm/chat/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          conversation_id: conversationId,
          tool: pendingApproval.tool,
          params: pendingApproval.params,
          approved,
        }),
      })
      const data: ApproveResponse & { error?: string } = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || `Approval failed (${res.status})`)
        return
      }
      const a = data.assistant
      if (a) {
        const hasId = typeof (a as GtmMessage).id === 'string' && (a as GtmMessage).id
        const assistantMsg: GtmMessage = hasId ? (a as GtmMessage) : {
          id: 'denied-' + Date.now(),
          conversation_id: conversationId,
          role: 'assistant',
          content: (a as { content?: string }).content ?? '',
          tool_call: null,
          task_id: null,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        if (data.steps && data.steps.length > 0) {
          setTraces((prev) => ({ ...prev, [assistantMsg.id]: data.steps! }))
        }
      }
      setPendingApproval(null)
      setFollowups(data.followups ?? [])
      if (approved && data.tool_used) {
        toast.success(`Ran: ${data.tool_used}`, { duration: 1800 })
      }
      if (data.route_to) {
        setTimeout(() => router.push(data.route_to!), 700)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setPhase('idle')
      setStage('')
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

  const isBusy = phase !== 'idle'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', background: 'var(--bg-elev)',
      border: '1px solid var(--rule)', borderRadius: compact ? 14 : 16,
      height: compact ? 520 : 620, maxHeight: '85vh', overflow: 'hidden',
    }}>
      <div style={{ padding: compact ? '12px 16px' : '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>GTM Orchestrator</div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{workspace.name} · {workspace.url.replace(/^https?:\/\//, '')}</div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close chat" style={{ background: 'transparent', border: 0, fontSize: 18, color: 'var(--ink-faint)', cursor: 'pointer', padding: 4 }}>×</button>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: compact ? 12 : 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && phase === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 6 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
              I can audit a URL, train your voice, draft creator DMs, run a playbook, or just chat about your GTM strategy. Try:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} style={{ background: 'transparent', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '6px 12px', fontSize: 12.5, color: 'var(--ink-dim)', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => <Bubble key={m.id} message={m} compact={compact} steps={traces[m.id]} live={isBusy && m.id === messages[messages.length - 1]?.id && m.role === 'assistant'} />)}
        {isBusy && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
            <span style={{ display: 'inline-flex', gap: 3 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-faint)', animation: 'gtm-dot 1.2s infinite' }} />
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-faint)', animation: 'gtm-dot 1.2s 0.2s infinite' }} />
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-faint)', animation: 'gtm-dot 1.2s 0.4s infinite' }} />
            </span>
            {stage || 'thinking…'}
          </div>
        )}
      </div>

      {pendingApproval && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--accent-border)', background: 'var(--accent-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Approval needed</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 10, lineHeight: 1.5 }}>
            Run <strong style={{ fontFamily: 'var(--mono)' }}>{pendingApproval.tool}</strong>?
            {pendingApproval.reason && <span style={{ color: 'var(--ink-dim)' }}> — {pendingApproval.reason}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => decide(true)} disabled={isBusy} style={{ background: 'var(--accent)', color: '#fff', border: 0, borderRadius: 999, padding: '7px 16px', fontSize: 12.5, fontWeight: 600, cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1 }}>
              Approve
            </button>
            <button type="button" onClick={() => decide(false)} disabled={isBusy} style={{ background: 'transparent', border: '1px solid var(--rule-strong)', color: 'var(--ink-dim)', borderRadius: 999, padding: '7px 16px', fontSize: 12.5, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
              Deny
            </button>
          </div>
        </div>
      )}

      {followups.length > 0 && !pendingApproval && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--rule)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {followups.map((f) => (
            <button key={f} type="button" onClick={() => send(f)} style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 999, padding: '5px 11px', fontSize: 12, color: 'var(--ink-dim)', cursor: 'pointer' }}>
              {f}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--rule)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything, or try /audit /icp /voice /help…"
          autoComplete="off"
          style={{ flex: 1, background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 999, padding: '10px 16px', fontSize: 14, color: 'var(--ink)', outline: 'none' }}
        />
        <button type="submit" disabled={isBusy || !input.trim()} style={{ background: isBusy || !input.trim() ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: isBusy || !input.trim() ? 'not-allowed' : 'pointer' }}>
          Send
        </button>
      </form>
    </div>
  )
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1).trimEnd() + '…'
}

function Bubble({ message, compact, steps, live }: { message: GtmMessage; compact?: boolean; steps?: StepTrace[]; live?: boolean }) {
  const isUser = message.role === 'user'
  // Show every non-final step in the trace (tool_call, approval_request, error).
  const traceSteps = (steps ?? []).filter((s) => s.action_kind !== 'final_answer')
  const isPreamble = !isUser && (message.tool_call?.name === 'preamble' || message.tool_call?.name === 'chat')
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: compact ? '85%' : '78%',
        background: isUser ? 'var(--accent)' : 'var(--bg)',
        color: isUser ? '#fff' : 'var(--ink)',
        border: isUser ? 'none' : '1px solid var(--rule)',
        borderRadius: 14,
        padding: '10px 14px',
        fontSize: 14,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.content}
        {!isUser && traceSteps.length > 0 && (
          <details style={{ marginTop: 10 }} open={live}>
            <summary style={{ cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', userSelect: 'none', listStyle: 'none' }}>
              {live ? '◉' : '▸'} {traceSteps.length} step{traceSteps.length === 1 ? '' : 's'}
              {message.task_id && (
                <a href={`/gtm/tasks/${message.task_id}/trace`} onClick={(e) => e.stopPropagation()} style={{ marginLeft: 10, color: 'var(--ink-faint)', textDecoration: 'underline' }}>full trace →</a>
              )}
            </summary>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 10, borderLeft: '2px solid var(--rule)' }}>
              {traceSteps.map((s) => (
                <div key={s.step_index} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {s.thought && (
                    <div style={{ fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.45 }}>🧠 {s.thought}</div>
                  )}
                  <div style={{ fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--ink-dim)', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
                    <span>⚙</span>
                    <span style={{ color: s.action_kind === 'error' ? '#c0392b' : 'var(--ink)' }}>{s.tool_name ?? s.action_kind}</span>
                    {s.observation && <span style={{ color: 'var(--ink-faint)' }}>→ {truncate(s.observation, 140)}</span>}
                    {s.task_id && (
                      <a href={`/gtm/tasks/${s.task_id}`} style={{ marginLeft: 4, color: 'var(--accent)' }}>view task →</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
        {!isPreamble && message.tool_call?.name && !isUser && (
          <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
            via <em>{message.tool_call.name}</em>
            {message.task_id && (
              <a href={`/gtm/tasks/${message.task_id}`} style={{ marginLeft: 8, color: 'var(--ink-faint)' }}>view task →</a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
