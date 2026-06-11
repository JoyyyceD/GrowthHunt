'use client'
/**
 * /scout/[id]/calendar — publish calendar (V2-T5 + batch C).
 * List view (default): pending-approval / scheduled groups with bulk
 * approve — the "what needs me today" working view. Week/Month grids keep
 * the time-distribution overview, with native drag-to-reschedule.
 */
import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { LeftRail, PostEditor, btnPrimary, type QueueItem } from '../../ui'

const DAY_MS = 86_400_000

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(x.getDate() - x.getDay()) // Sunday start
  return x
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const STATUS_GLYPH: Record<string, { glyph: string; color: string }> = {
  proposed: { glyph: '◇', color: 'var(--warn)' },
  scheduled: { glyph: '◆', color: 'var(--accent)' },
  posted: { glyph: '●', color: 'var(--ink-faint)' },
  failed: { glyph: '○', color: '#c0392b' },
}

const PLATFORM_ICON: Record<string, string> = { x: '𝕏', linkedin: 'in', reddit: '◓', facebook: 'f' }

export default function ScoutCalendar({ params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = use(params)
  const [view, setView] = useState<'list' | 'week' | 'month'>('list')
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [posts, setPosts] = useState<QueueItem[]>([])
  const [openPost, setOpenPost] = useState<QueueItem | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [bulkState, setBulkState] = useState<'idle' | 'running'>('idle')
  const [bulkMsg, setBulkMsg] = useState('')

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/scout/queue?ws=${workspaceId}&limit=200`)
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(`/scout/${workspaceId}/calendar`)}`
      return
    }
    if (res.ok) setPosts((await res.json()).posts || [])
  }, [workspaceId])

  useEffect(() => { void refresh() }, [refresh])

  const byDay = useMemo(() => {
    const map = new Map<string, QueueItem[]>()
    for (const p of posts) {
      const when = p.scheduled_for || p.posted_at
      if (!when) continue
      const key = dayKey(new Date(when))
      map.set(key, [...(map.get(key) || []), p])
    }
    for (const list of map.values()) {
      list.sort((a, b) => Date.parse(a.scheduled_for || a.posted_at || '') - Date.parse(b.scheduled_for || b.posted_at || ''))
    }
    return map
  }, [posts])

  async function rescheduleTo(postId: string, day: Date) {
    const post = posts.find(p => p.id === postId)
    if (!post || !(post.status === 'proposed' || post.status === 'scheduled')) return
    const prev = post.scheduled_for ? new Date(post.scheduled_for) : new Date()
    const next = new Date(day)
    next.setHours(prev.getHours(), prev.getMinutes(), 0, 0)
    await fetch(`/api/scout/queue/${postId}?ws=${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', scheduled_for: next.toISOString() }),
    })
    void refresh()
  }

  async function approveAll(pending: QueueItem[]) {
    setBulkState('running')
    setBulkMsg('')
    let ok = 0
    for (const p of pending) {
      const res = await fetch(`/api/scout/queue/${p.id}?ws=${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.needsConnection) {
        setBulkMsg(`__CONNECT__${data.platform}`)
        break
      }
      if (res.ok) ok++
    }
    if (ok) setBulkMsg(m => m || `Approved ${ok} post${ok > 1 ? 's' : ''} ✓`)
    setBulkState('idle')
    void refresh()
  }

  const pending = posts
    .filter(p => p.status === 'proposed')
    .sort((a, b) => Date.parse(a.scheduled_for || '9999') - Date.parse(b.scheduled_for || '9999'))
  const scheduled = posts
    .filter(p => p.status === 'scheduled')
    .sort((a, b) => Date.parse(a.scheduled_for || '9999') - Date.parse(b.scheduled_for || '9999'))

  const days: Date[] = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(anchor)
      return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY_MS))
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const start = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * DAY_MS))
  }, [view, anchor])

  const todayKey = dayKey(new Date())
  const title = view === 'list' ? 'Publish queue' : anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function shift(direction: 1 | -1) {
    setAnchor(a => view === 'week'
      ? new Date(a.getTime() + direction * 7 * DAY_MS)
      : new Date(a.getFullYear(), a.getMonth() + direction, 1))
  }

  function ListRow({ p }: { p: QueueItem }) {
    const s = STATUS_GLYPH[p.status] || STATUS_GLYPH.scheduled
    return (
      <div
        onClick={() => setOpenPost(p)}
        style={{
          display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer',
          border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-elev)',
          padding: '12px 16px', marginBottom: 8,
        }}
      >
        <div className="mono" style={{ fontSize: 12, color: s.color, width: 110, flexShrink: 0, paddingTop: 2 }}>
          <span>{s.glyph}</span>{' '}
          {p.scheduled_for
            ? new Date(p.scheduled_for).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric' })
            : 'unscheduled'}
        </div>
        <div className="mono" style={{ fontSize: 13, width: 26, flexShrink: 0, color: 'var(--ink-dim)', paddingTop: 1 }} aria-hidden>
          {PLATFORM_ICON[p.platform] || '·'}
        </div>
        <div
          style={{
            fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)', minWidth: 0,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}
        >
          {p.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <LeftRail workspaceId={workspaceId} workspaceName="" active="calendar" />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '20px 24px', overflowY: view === 'list' ? 'auto' : 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 className="serif" style={{ fontSize: 26, margin: 0 }}>{title}</h1>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {(['list', 'week', 'month'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{ ...btn, background: view === v ? 'var(--bg-card)' : 'transparent', fontWeight: view === v ? 600 : 400 }}
              >
                {v === 'list' ? 'List' : v === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
            {view !== 'list' && (
              <>
                <button style={btn} onClick={() => shift(-1)}>←</button>
                <button style={btn} onClick={() => setAnchor(startOfDay(new Date()))}>Today</button>
                <button style={btn} onClick={() => shift(1)}>→</button>
              </>
            )}
          </div>
        </div>

        {view === 'list' ? (
          <div style={{ maxWidth: 780 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="eyebrow"><span className="dot" />Pending approval ({pending.length})</div>
              {pending.length > 0 && (
                <button
                  style={{ ...btnPrimary, fontSize: 12.5, padding: '6px 16px', opacity: bulkState === 'running' ? 0.6 : 1 }}
                  disabled={bulkState === 'running'}
                  onClick={() => void approveAll(pending)}
                >
                  {bulkState === 'running' ? 'Approving…' : 'Approve all'}
                </button>
              )}
            </div>
            {bulkMsg && (
              <div style={{ fontSize: 12.5, marginBottom: 10, color: bulkMsg.startsWith('__CONNECT__') ? 'var(--warn)' : 'var(--ink-dim)' }}>
                {bulkMsg.startsWith('__CONNECT__') ? (
                  <a href={`/scout/${workspaceId}/integrations`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    Connect {bulkMsg.replace('__CONNECT__', '')} first → open Integrations
                  </a>
                ) : bulkMsg}
              </div>
            )}
            {pending.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 18 }}>Nothing waiting on you. 🐾</div>
            )}
            {pending.map(p => <ListRow key={p.id} p={p} />)}

            <div className="eyebrow" style={{ margin: '22px 0 10px' }}><span className="dot" />Scheduled ({scheduled.length})</div>
            {scheduled.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Nothing scheduled yet — approve a draft above.</div>
            )}
            {scheduled.map(p => <ListRow key={p.id} p={p} />)}
          </div>
        ) : (
          <>
            <div
              style={{
                flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                gridAutoRows: view === 'week' ? '1fr' : 'minmax(96px, 1fr)',
                border: '1px solid var(--rule)', borderRadius: 12, overflow: 'auto', background: 'var(--bg-elev)',
              }}
            >
              {days.map((day, i) => {
                const key = dayKey(day)
                const inMonth = view === 'week' || day.getMonth() === anchor.getMonth()
                const dayPosts = byDay.get(key) || []
                const shown = view === 'week' ? dayPosts : dayPosts.slice(0, 3)
                return (
                  <div
                    key={key}
                    onDragOver={e => { if (dragId) e.preventDefault() }}
                    onDrop={e => { e.preventDefault(); if (dragId) { void rescheduleTo(dragId, day); setDragId(null) } }}
                    style={{
                      borderRight: (i + 1) % 7 ? '1px solid var(--rule)' : 'none',
                      borderBottom: i < days.length - 7 ? '1px solid var(--rule)' : 'none',
                      padding: 6, minWidth: 0, opacity: inMonth ? 1 : 0.45,
                      background: key === todayKey ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >
                    <div className="mono" style={{ fontSize: 11, color: key === todayKey ? 'var(--accent)' : 'var(--ink-faint)', marginBottom: 4 }}>
                      {view === 'week' ? day.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) : day.getDate()}
                    </div>
                    {shown.map(p => {
                      const s = STATUS_GLYPH[p.status] || STATUS_GLYPH.scheduled
                      const draggable = p.status === 'proposed' || p.status === 'scheduled'
                      return (
                        <div
                          key={p.id}
                          draggable={draggable}
                          onDragStart={() => setDragId(p.id)}
                          onDragEnd={() => setDragId(null)}
                          onClick={() => setOpenPost(p)}
                          title={p.content}
                          style={{
                            fontSize: 11.5, padding: '3px 6px', borderRadius: 6, marginBottom: 3,
                            background: 'var(--bg)', border: '1px solid var(--rule)',
                            cursor: draggable ? 'grab' : 'pointer',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            opacity: dragId === p.id ? 0.4 : 1,
                          }}
                        >
                          <span style={{ color: s.color }}>{s.glyph}</span>{' '}
                          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                            {new Date(p.scheduled_for || p.posted_at || '').toLocaleTimeString('en-US', { hour: 'numeric' })}
                          </span>{' '}
                          {p.content}
                        </div>
                      )
                    })}
                    {view === 'month' && dayPosts.length > 3 && (
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>+{dayPosts.length - 3} more</div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }} className="mono">
              {Object.entries(STATUS_GLYPH).map(([status, s]) => (
                <span key={status} style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  <span style={{ color: s.color }}>{s.glyph}</span> {status}
                </span>
              ))}
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 'auto' }}>Drag a post to another day to reschedule</span>
            </div>
          </>
        )}
      </div>

      {openPost && (
        <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--rule)', padding: 16, overflowY: 'auto' }}>
          <PostEditor
            post={openPost}
            workspaceId={workspaceId}
            onClose={() => setOpenPost(null)}
            onChanged={() => { setOpenPost(null); void refresh() }}
          />
        </div>
      )}
    </div>
  )
}

const btn: React.CSSProperties = {
  fontSize: 12.5, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--rule-strong)',
  background: 'transparent', color: 'var(--ink)', cursor: 'pointer',
}
