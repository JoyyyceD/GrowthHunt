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

interface ChatTurnResponse {
  conversation_id: string
  assistant: GtmMessage
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
  const [phase, setPhase] = useState<'idle' | 'sending'>('idle')
  const [followups, setFollowups] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, phase, pendingApproval])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || phase === 'sending') return
    setInput('')
    setPhase('sending')
    setFollowups([])
    setPendingApproval(null)
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

    try {
      const res = await fetch('/api/gtm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          conversation_id: conversationId ?? undefined,
          message: trimmed,
        }),
      })
      const data: ChatTurnResponse | { error?: string } = await res.json()
      if (!res.ok || 'error' in data) {
        const msg = ('error' in data && data.error) || `Chat failed (${res.status})`
        toast.error(msg)
        setMessages((prev) => prev.filter((m) => m.id !== tempUser.id))
        return
      }
      const ok = data as ChatTurnResponse
      setConversationId(ok.conversation_id)
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUser.id)
        const userPersisted: GtmMessage = { ...tempUser, conversation_id: ok.conversation_id }
        return [...withoutTemp, userPersisted, ok.assistant]
      })
      if (ok.steps && ok.steps.length > 0) {
        setTraces((prev) => ({ ...prev, [ok.assistant.id]: ok.steps! }))
      }
      if (ok.approval_request) {
        setPendingApproval({ ...ok.approval_request, messageId: ok.assistant.id })
      }
      setFollowups(ok.followups ?? [])
      if (ok.tool_used && ok.tool_used !== 'approval_request') {
        toast.success(`Tool: ${ok.tool_used}`, { duration: 1800 })
      }
      if (ok.route_to) {
        // Tiny delay so the assistant message renders before redirect
        setTimeout(() => router.push(ok.route_to!), 700)
      }
    } catch (err) {
      toast.error((err as Error).message)
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id))
    } finally {
      setPhase('idle')
    }
  }

  async function decide(approved: boolean) {
    if (!pendingApproval || !conversationId || phase === 'sending') return
    setPhase('sending')
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
        // Approve endpoint returns full GtmMessage; deny path returns partial { content }
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
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

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
              I can audit a URL, train your voice, draft creator DMs, run a playbook, or just answer questions about your workspace. Try:
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
        {messages.map((m) => <Bubble key={m.id} message={m} compact={compact} steps={traces[m.id]} />)}
        {phase === 'sending' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
            <span style={{ display: 'inline-flex', gap: 3 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-faint)', animation: 'gtm-dot 1.2s infinite' }} />
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-faint)', animation: 'gtm-dot 1.2s 0.2s infinite' }} />
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-faint)', animation: 'gtm-dot 1.2s 0.4s infinite' }} />
            </span>
            thinking…
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
            <button type="button" onClick={() => decide(true)} disabled={phase === 'sending'} style={{ background: 'var(--accent)', color: '#fff', border: 0, borderRadius: 999, padding: '7px 16px', fontSize: 12.5, fontWeight: 600, cursor: phase === 'sending' ? 'not-allowed' : 'pointer', opacity: phase === 'sending' ? 0.6 : 1 }}>
              Approve
            </button>
            <button type="button" onClick={() => decide(false)} disabled={phase === 'sending'} style={{ background: 'transparent', border: '1px solid var(--rule-strong)', color: 'var(--ink-dim)', borderRadius: 999, padding: '7px 16px', fontSize: 12.5, cursor: phase === 'sending' ? 'not-allowed' : 'pointer' }}>
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
        <button type="submit" disabled={phase === 'sending' || !input.trim()} style={{ background: phase === 'sending' || !input.trim() ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: phase === 'sending' || !input.trim() ? 'not-allowed' : 'pointer' }}>
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

function Bubble({ message, compact, steps }: { message: GtmMessage; compact?: boolean; steps?: StepTrace[] }) {
  const isUser = message.role === 'user'
  // Show every non-final step in the trace (tool_call, approval_request, error).
  const traceSteps = (steps ?? []).filter((s) => s.action_kind !== 'final_answer')
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
        {!isUser && traceSteps.length > 0 && (
          <details style={{ marginBottom: 8 }}>
            <summary style={{ cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', userSelect: 'none', listStyle: 'none' }}>
              ▸ {traceSteps.length} step{traceSteps.length === 1 ? '' : 's'}
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
        {message.content}
        {message.tool_call?.name && !isUser && (
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
