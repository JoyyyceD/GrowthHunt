'use client'
/**
 * /scout/[id]/activity — everything Scout has shipped (V2-T6): posted and
 * failed posts in a day-grouped stream, links to the live posts, retry on
 * failures. Upcoming work lives in the queue/calendar, not here.
 */
import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { LeftRail, PostEditor, externalPostUrl, type QueueItem } from '../../ui'

const PLATFORM_ICON: Record<string, string> = { x: '𝕏', linkedin: 'in', reddit: '◓', facebook: 'f' }

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86_400_000)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Today'
  if (same(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ScoutActivity({ params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = use(params)
  const [posts, setPosts] = useState<QueueItem[]>([])
  const [openPost, setOpenPost] = useState<QueueItem | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/scout/queue?ws=${workspaceId}&limit=200`)
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(`/scout/${workspaceId}/activity`)}`
      return
    }
    if (res.ok) setPosts((await res.json()).posts || [])
  }, [workspaceId])

  useEffect(() => { void refresh() }, [refresh])

  const published = posts.filter(p => p.status === 'posted')
  const failed = posts.filter(p => p.status === 'failed')
  const next7 = posts.filter(p =>
    p.status === 'scheduled' && p.scheduled_for &&
    Date.parse(p.scheduled_for) > Date.now() &&
    Date.parse(p.scheduled_for) < Date.now() + 7 * 86_400_000,
  ).length

  const stream = useMemo(() => {
    const items = [...published, ...failed].sort(
      (a, b) => Date.parse(b.posted_at || b.scheduled_for || '') - Date.parse(a.posted_at || a.scheduled_for || ''),
    )
    const groups: Array<{ label: string; items: QueueItem[] }> = []
    for (const p of items) {
      const label = dayLabel(p.posted_at || p.scheduled_for || new Date().toISOString())
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.items.push(p)
      else groups.push({ label, items: [p] })
    }
    return groups
  }, [posts])

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <LeftRail workspaceId={workspaceId} workspaceName="" active="activity" />
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '28px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
            <div>
              <h1 className="serif" style={{ fontSize: 30, margin: '0 0 6px' }}>Activity</h1>
              <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0 }}>
                Everything I&apos;ve shipped for you — and anything that needs a retry.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={statCard}>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{published.length}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>Published</div>
              </div>
              <div style={statCard}>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{next7}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>Next 7 days</div>
              </div>
            </div>
          </div>

          {stream.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 24px', border: '1.5px dashed var(--rule-strong)', borderRadius: 14, marginTop: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }} aria-hidden>🐾</div>
              <div style={{ fontSize: 14.5, color: 'var(--ink-dim)' }}>
                Nothing shipped yet. Approve a draft in the queue — once an integration is connected, it shows up here the moment it goes live.
              </div>
            </div>
          )}

          {stream.map(group => (
            <section key={group.label} style={{ marginTop: 26 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />{group.label}</div>
              {group.items.map(p => {
                const url = externalPostUrl(p.platform, p.external_post_id)
                const isOpen = expanded.has(p.id)
                return (
                  <div key={p.id} style={{ border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-elev)', padding: '12px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-dim)' }}>
                        {PLATFORM_ICON[p.platform] || '·'} {p.platform} ·{' '}
                        {new Date(p.posted_at || p.scheduled_for || '').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {p.status === 'posted' ? (
                        <span className="mono" style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: 'var(--bg-card)', color: 'var(--ink-dim)' }}>● published</span>
                      ) : (
                        <span className="mono" style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: 'rgba(192,57,43,0.1)', color: '#c0392b' }}>○ failed</span>
                      )}
                      <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer" style={linkBtn}>View post ↗</a>
                        )}
                        {p.status === 'failed' && (
                          <button style={linkBtn} onClick={() => setOpenPost(p)}>Fix & retry</button>
                        )}
                      </span>
                    </div>
                    <div
                      onClick={() => setExpanded(s => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n })}
                      style={{
                        fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', cursor: 'pointer',
                        ...(isOpen ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }),
                      }}
                    >
                      {p.content}
                    </div>
                    {p.status === 'failed' && p.error && (
                      <div className="mono" style={{ fontSize: 11.5, color: '#c0392b', marginTop: 6 }}>⚠ {p.error}</div>
                    )}
                  </div>
                )
              })}
            </section>
          ))}
        </div>
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

const statCard: React.CSSProperties = {
  border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-elev)',
  padding: '10px 18px', textAlign: 'center', minWidth: 86,
}

const linkBtn: React.CSSProperties = {
  fontSize: 11.5, padding: '3px 10px', borderRadius: 8, border: '1px solid var(--rule-strong)',
  background: 'transparent', color: 'var(--ink-dim)', cursor: 'pointer', textDecoration: 'none',
}
