'use client'
/**
 * Scout workspace UI kit — shared by the hero page (in-place transition) and
 * /scout/[id]. Blocks map 1:1 to SSE event types (decision 3.6).
 * Visual language: GrowthHunt V1 Editorial (decision 3.9).
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ---------- types (client-side mirror of lib/scout/types) ----------

export type ScoutEvent =
  | { type: 'workspace'; workspaceId: string }
  | { type: 'conversation'; conversationId: string }
  | { type: 'text_delta'; text: string }
  | { type: 'step'; tool: string; label: string; status: 'start' | 'done' | 'error' }
  | { type: 'artifact_delta'; slug: string; text: string }
  | { type: 'artifact_done'; slug: string; title: string; rev: number }
  | { type: 'post_drafts'; drafts: Array<{ platform: string; content: string; hook?: string; scheduledFor?: string | null }> }
  | { type: 'ask_user'; question: string; options?: string[] }
  | { type: 'status'; stage: string; narration: string }
  | { type: 'done'; reply: string }
  | { type: 'error'; message: string }

export type Block =
  | { kind: 'user'; text: string }
  | { kind: 'scout'; text: string; streaming?: boolean }
  | { kind: 'step'; tool: string; label: string; status: 'start' | 'done' | 'error' }
  | { kind: 'narration'; text: string }
  | { kind: 'artifact'; slug: string; title?: string; rev?: number; text: string; done: boolean }
  | { kind: 'posts'; drafts: Array<{ platform: string; content: string; hook?: string }> }
  | { kind: 'ask'; question: string; options?: string[] }
  | { kind: 'error'; text: string }

export interface ArtifactMeta {
  slug: string
  title: string
  summary: string | null
  rev: number
  updated_at: string
}

export interface QueueItem {
  id: string
  platform: string
  status: string
  content: string
  scheduled_for: string | null
}

// ---------- SSE consumption ----------

export async function streamSse(
  url: string,
  body: Record<string, unknown>,
  onEvent: (e: ScoutEvent) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  if (!res.body) throw new Error('no stream')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data:')) continue
      try {
        onEvent(JSON.parse(line.slice(5).trim()))
      } catch {
        // skip malformed frame
      }
    }
  }
}

/** Fold a ScoutEvent into the block list (mutating copy). */
export function reduceBlocks(blocks: Block[], e: ScoutEvent): Block[] {
  const next = [...blocks]
  const last = next[next.length - 1]
  switch (e.type) {
    case 'text_delta': {
      if (last?.kind === 'scout' && last.streaming) {
        next[next.length - 1] = { ...last, text: last.text + e.text }
      } else {
        next.push({ kind: 'scout', text: e.text, streaming: true })
      }
      return next
    }
    case 'step': {
      if (e.status !== 'start') {
        for (let i = next.length - 1; i >= 0; i--) {
          const b = next[i]
          if (b.kind === 'step' && b.tool === e.tool && b.status === 'start') {
            next[i] = { ...b, status: e.status }
            return next
          }
        }
      }
      next.push({ kind: 'step', tool: e.tool, label: e.label, status: e.status })
      return next
    }
    case 'status':
      next.push({ kind: 'narration', text: e.narration })
      return next
    case 'artifact_delta': {
      for (let i = next.length - 1; i >= 0; i--) {
        const b = next[i]
        if (b.kind === 'artifact' && b.slug === e.slug && !b.done) {
          next[i] = { ...b, text: b.text + e.text }
          return next
        }
      }
      next.push({ kind: 'artifact', slug: e.slug, text: e.text, done: false })
      return next
    }
    case 'artifact_done': {
      for (let i = next.length - 1; i >= 0; i--) {
        const b = next[i]
        if (b.kind === 'artifact' && b.slug === e.slug && !b.done) {
          next[i] = { ...b, title: e.title, rev: e.rev, done: true }
          return next
        }
      }
      next.push({ kind: 'artifact', slug: e.slug, title: e.title, rev: e.rev, text: '', done: true })
      return next
    }
    case 'post_drafts':
      next.push({ kind: 'posts', drafts: e.drafts })
      return next
    case 'ask_user':
      next.push({ kind: 'ask', question: e.question, options: e.options })
      return next
    case 'done': {
      if (last?.kind === 'scout' && last.streaming) {
        next[next.length - 1] = { kind: 'scout', text: e.reply || last.text }
      } else if (e.reply) {
        next.push({ kind: 'scout', text: e.reply })
      }
      return next
    }
    case 'error':
      next.push({ kind: 'error', text: e.message })
      return next
    default:
      return next
  }
}

// ---------- atoms ----------

const card: React.CSSProperties = {
  border: '1px solid var(--rule)',
  borderRadius: 12,
  background: 'var(--bg-elev)',
}

export function ScoutAvatar({ size = 36, busy = false }: { size?: number; busy?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent-soft)', border: '1.5px solid var(--accent-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.5, animation: busy ? 'pulse 1.6s ease-in-out infinite' : undefined,
      }}
    >
      🐾
    </div>
  )
}

export function ProcessLine({ block }: { block: Extract<Block, { kind: 'step' }> }) {
  const icon = block.status === 'start' ? '◌' : block.status === 'done' ? '●' : '○'
  return (
    <div className="mono" style={{ fontSize: 12, color: block.status === 'error' ? 'var(--warn)' : 'var(--ink-faint)', padding: '2px 0' }}>
      {icon} {block.label}
    </div>
  )
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="scout-md" style={{ fontSize: 14.5, lineHeight: 1.65 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  )
}

export function ArtifactCard({ block, workspaceId }: { block: Extract<Block, { kind: 'artifact' }>; workspaceId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ ...card, margin: '8px 0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>📝 {block.slug}.md</span>
          {block.done ? (
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>rev {block.rev}</span>
          ) : (
            <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>writing…</span>
          )}
        </div>
        {block.done && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setExpanded(v => !v)} style={btnSmall}>{expanded ? 'Collapse' : 'Expand'}</button>
            <button
              style={btnSmall}
              onClick={async () => {
                const res = await fetch(`/api/scout/artifacts/${block.slug}?ws=${workspaceId}`)
                const data = await res.json()
                await navigator.clipboard.writeText(data.artifact?.content_md || block.text)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            <a href={`/api/scout/artifacts/${block.slug}?ws=${workspaceId}&download=1`} style={{ ...btnSmall, textDecoration: 'none' }}>.md</a>
          </div>
        )}
      </div>
      <div style={{ padding: '10px 16px', maxHeight: expanded ? undefined : 260, overflow: 'hidden', position: 'relative' }}>
        <Markdown text={block.text || (block.done ? `*Open in Files to read ${block.title || block.slug}.*` : '')} />
        {!expanded && (block.text.length > 800) && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(transparent, var(--bg-elev))' }} />
        )}
      </div>
    </div>
  )
}

const PLATFORM_ICON: Record<string, string> = { x: '𝕏', linkedin: 'in', reddit: '◓', facebook: 'f' }

export function PostCards({ drafts }: { drafts: Array<{ platform: string; content: string; hook?: string }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' }}>
      {drafts.map((d, i) => (
        <div key={i} style={{ ...card, padding: '10px 14px' }}>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-dim)', marginBottom: 6 }}>
            {PLATFORM_ICON[d.platform] || '·'} {d.platform}{d.hook ? ` · ${d.hook} hook` : ''} · {d.content.length} chars
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{d.content}</div>
        </div>
      ))}
    </div>
  )
}

const btnSmall: React.CSSProperties = {
  fontSize: 12, padding: '3px 10px', borderRadius: 8, border: '1px solid var(--rule-strong)',
  background: 'transparent', color: 'var(--ink-dim)', cursor: 'pointer',
}

export const btnPrimary: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, padding: '10px 22px', borderRadius: 10,
  border: 'none', background: 'var(--accent)', color: 'var(--accent-ink)', cursor: 'pointer',
}

// ---------- chat column ----------

export function ChatColumn({
  workspaceId,
  blocks,
  setBlocks,
  busy,
  setBusy,
  conversationId,
  setConversationId,
  suggestions,
  autoSend,
  onAutoSent,
}: {
  workspaceId: string
  blocks: Block[]
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
  busy: boolean
  setBusy: (v: boolean) => void
  conversationId: string | null
  setConversationId: (id: string) => void
  suggestions?: string[]
  autoSend?: string | null
  onAutoSent?: () => void
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [blocks.length])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || busy) return
    setBusy(true)
    setInput('')
    setBlocks(prev => [...prev, { kind: 'user', text }])
    try {
      await streamSse('/api/scout/chat', { workspaceId, conversationId, message: text }, e => {
        if (e.type === 'conversation') setConversationId(e.conversationId)
        else setBlocks(prev => reduceBlocks(prev, e))
      })
    } catch (err) {
      setBlocks(prev => [...prev, { kind: 'error', text: (err as Error).message }])
    } finally {
      setBusy(false)
    }
  }, [busy, workspaceId, conversationId, setBlocks, setBusy, setConversationId])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void send(input)
  }

  useEffect(() => {
    if (autoSend && !busy) {
      onAutoSent?.()
      void send(autoSend)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {blocks.map((b, i) => {
          switch (b.kind) {
            case 'user':
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0' }}>
                  <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '9px 14px', maxWidth: '78%', fontSize: 14.5 }}>{b.text}</div>
                </div>
              )
            case 'scout':
              return (
                <div key={i} style={{ display: 'flex', gap: 10, margin: '12px 0' }}>
                  <ScoutAvatar size={28} busy={!!b.streaming} />
                  <div style={{ minWidth: 0, flex: 1 }}><Markdown text={b.text} /></div>
                </div>
              )
            case 'narration':
              return (
                <div key={i} style={{ display: 'flex', gap: 10, margin: '12px 0' }}>
                  <ScoutAvatar size={28} />
                  <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)' }}>{b.text}</div>
                </div>
              )
            case 'step':
              return <ProcessLine key={i} block={b} />
            case 'artifact':
              return <ArtifactCard key={i} block={b} workspaceId={workspaceId} />
            case 'posts':
              return <PostCards key={i} drafts={b.drafts} />
            case 'ask':
              return (
                <div key={i} style={{ ...card, padding: '12px 16px', margin: '8px 0', borderColor: 'var(--accent-border)' }}>
                  <div style={{ fontSize: 14.5, marginBottom: b.options?.length ? 10 : 0 }}>{b.question}</div>
                  {b.options?.map(opt => (
                    <button key={opt} style={{ ...btnSmall, marginRight: 6 }} onClick={() => void send(opt)}>{opt}</button>
                  ))}
                </div>
              )
            case 'error':
              return (
                <div key={i} className="mono" style={{ fontSize: 12.5, color: 'var(--warn)', margin: '8px 0' }}>⚠ {b.text}</div>
              )
          }
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '12px 24px 18px', borderTop: '1px solid var(--rule)' }}>
        {!!suggestions?.length && !busy && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => void send(s)} style={{ ...btnSmall, borderRadius: 14 }}>{s}</button>
            ))}
          </div>
        )}
        <form onSubmit={onSubmit} style={{ display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={busy ? 'Scout is working…' : 'Message Scout…'}
            disabled={busy}
            style={{
              flex: 1, fontSize: 14.5, padding: '11px 14px', borderRadius: 10,
              border: '1px solid var(--rule-strong)', background: 'var(--bg-elev)', color: 'var(--ink)', outline: 'none',
            }}
          />
          <button type="submit" disabled={busy || !input.trim()} style={{ ...btnPrimary, opacity: busy || !input.trim() ? 0.5 : 1 }}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------- right rail ----------

export function RightRail({
  workspaceId,
  artifacts,
  queue,
  refreshQueue,
  collapsed,
  setCollapsed,
}: {
  workspaceId: string
  artifacts: ArtifactMeta[]
  queue: QueueItem[]
  refreshQueue: () => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}) {
  const [openPost, setOpenPost] = useState<QueueItem | null>(null)
  const [editText, setEditText] = useState('')
  const [actionErr, setActionErr] = useState('')

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} title="Open panel" style={{ ...btnSmall, alignSelf: 'flex-start', margin: 8 }}>
        ◀
      </button>
    )
  }

  async function act(id: string, action: 'approve' | 'edit' | 'cancel', content?: string) {
    setActionErr('')
    const res = await fetch(`/api/scout/queue/${id}?ws=${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, content }),
    })
    const data = await res.json()
    if (!res.ok) {
      setActionErr(data.error || 'failed')
      return
    }
    if (data.needsConnection) {
      setActionErr(`Connect ${data.platform} first → Integrations`)
      return
    }
    setOpenPost(null)
    refreshQueue()
  }

  const upcoming = queue.filter(q => q.status === 'proposed' || q.status === 'scheduled')

  return (
    <div style={{ width: 290, flexShrink: 0, borderLeft: '1px solid var(--rule)', overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="eyebrow"><span className="dot" />Upcoming</span>
        <button onClick={() => setCollapsed(true)} style={btnSmall}>▶</button>
      </div>
      {upcoming.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Queue is empty — tell Scout “what should I post today”.</div>
      )}
      {upcoming.map(q => (
        <div key={q.id} style={{ ...card, padding: '9px 12px', cursor: 'pointer' }} onClick={() => { setOpenPost(q); setEditText(q.content) }}>
          <div className="mono" style={{ fontSize: 11, color: q.status === 'proposed' ? 'var(--warn)' : 'var(--ink-dim)', marginBottom: 4 }}>
            {q.status === 'proposed' ? '◇ proposed' : '◆ scheduled'} · {q.platform}
            {q.scheduled_for ? ` · ${new Date(q.scheduled_for).toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric' })}` : ''}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.content}</div>
        </div>
      ))}
      {openPost && (
        <div style={{ ...card, padding: 14, borderColor: 'var(--accent-border)' }}>
          <div className="mono" style={{ fontSize: 11.5, marginBottom: 8 }}>{openPost.platform} · {openPost.status}</div>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={6}
            style={{ width: '100%', fontSize: 13, padding: 8, borderRadius: 8, border: '1px solid var(--rule-strong)', background: 'var(--bg)', color: 'var(--ink)', resize: 'vertical' }}
          />
          {actionErr && <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 6 }}>{actionErr}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {openPost.status === 'proposed' && (
              <button style={{ ...btnPrimary, fontSize: 12.5, padding: '5px 14px' }} onClick={() => void act(openPost.id, 'approve', editText !== openPost.content ? editText : undefined)}>
                Approve
              </button>
            )}
            {editText !== openPost.content && (
              <button style={btnSmall} onClick={() => void act(openPost.id, 'edit', editText)}>Save edit</button>
            )}
            <button style={btnSmall} onClick={() => void act(openPost.id, 'cancel')}>Remove</button>
            <button style={btnSmall} onClick={() => setOpenPost(null)}>Close</button>
          </div>
        </div>
      )}

      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Knowledge base</div>
        {artifacts.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>No documents yet.</div>}
        {artifacts.map(a => (
          <a
            key={a.slug}
            href={`/scout/${workspaceId}/files?doc=${a.slug}`}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'none' }}
          >
            <span>📄 {a.slug}</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>rev {a.rev}</span>
          </a>
        ))}
      </div>

      {artifacts.length > 0 && <SharePanel workspaceId={workspaceId} />}
    </div>
  )
}

/** Share toggle for the public playbook report (V2-T2). Private by default. */
function SharePanel({ workspaceId }: { workspaceId: string }) {
  const [report, setReport] = useState<{ slug: string; enabled: boolean; view_count: number } | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/scout/share?ws=${workspaceId}`)
      if (res.ok) setReport((await res.json()).report)
      setLoaded(true)
    })()
  }, [workspaceId])

  async function toggle(enabled: boolean) {
    const res = await fetch(`/api/scout/share?ws=${workspaceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    if (res.ok) setReport((await res.json()).report)
  }

  if (!loaded) return null
  const url = report ? `${typeof window !== 'undefined' ? window.location.origin : ''}/scout/report/${report.slug}` : ''

  return (
    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Share playbook</div>
      {report?.enabled ? (
        <>
          <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: 8 }}>
            Public · {report.view_count} view{report.view_count === 1 ? '' : 's'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              style={btnSmall}
              onClick={async () => {
                await navigator.clipboard.writeText(url)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <a href={url} target="_blank" rel="noreferrer" style={{ ...btnSmall, textDecoration: 'none' }}>Open</a>
            <button style={btnSmall} onClick={() => void toggle(false)}>Make private</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: 8 }}>
            Publish a read-only page of your playbook — great for your team or your audience.
          </div>
          <button style={{ ...btnPrimary, fontSize: 12.5, padding: '6px 14px' }} onClick={() => void toggle(true)}>
            Share publicly
          </button>
        </>
      )}
    </div>
  )
}

// ---------- left rail ----------

export function LeftRail({ workspaceId, workspaceName, active }: { workspaceId: string; workspaceName: string; active: 'chat' | 'files' | 'assets' }) {
  const nav = [
    { label: 'Chat', href: `/scout/${workspaceId}`, key: 'chat' },
    { label: 'Files', href: `/scout/${workspaceId}/files`, key: 'files' },
    { label: 'Assets', href: `/scout/${workspaceId}/assets`, key: 'assets' },
  ]
  return (
    <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--rule)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <a href="/scout" className="serif" style={{ fontSize: 19, color: 'var(--ink)' }}>{workspaceName || 'Scout'}</a>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg-card)' }}>
        <ScoutAvatar size={30} />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Scout</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-dim)' }}>Your growth teammate</div>
        </div>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(n => (
          <a
            key={n.key}
            href={n.href}
            style={{
              padding: '7px 10px', borderRadius: 8, fontSize: 13.5,
              background: active === n.key ? 'var(--bg-card)' : 'transparent',
              color: active === n.key ? 'var(--ink)' : 'var(--ink-dim)',
              fontWeight: active === n.key ? 600 : 400,
            }}
          >
            {n.label}
          </a>
        ))}
        <span style={{ padding: '7px 10px', fontSize: 13.5, color: 'var(--ink-faint)' }}>Calendar · soon</span>
      </nav>
      <div style={{ marginTop: 'auto', fontSize: 11.5, color: 'var(--ink-faint)' }} className="mono">
        scout beta
      </div>
    </div>
  )
}

// ---------- data hooks ----------

export function useWorkspaceData(workspaceId: string | null) {
  const [artifacts, setArtifacts] = useState<ArtifactMeta[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const refresh = useCallback(async () => {
    if (!workspaceId) return
    const [aRes, qRes] = await Promise.all([
      fetch(`/api/scout/artifacts?ws=${workspaceId}`),
      fetch(`/api/scout/queue?ws=${workspaceId}`),
    ])
    if (aRes.ok) setArtifacts((await aRes.json()).artifacts || [])
    if (qRes.ok) setQueue((await qRes.json()).posts || [])
  }, [workspaceId])
  useEffect(() => { void refresh() }, [refresh])
  return { artifacts, queue, refresh }
}
