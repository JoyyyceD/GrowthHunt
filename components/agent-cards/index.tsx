'use client'

/**
 * Generative UI card registry — `ui.kind` from a ToolResult maps to a React
 * component here. ChatPanel renders the card instead of markdown when present.
 *
 * Adding a card:
 *   1. Implement a component below that takes `props` (and optional taskId).
 *   2. Register the kind → component mapping in CARDS.
 *   3. In the tool's run(), return `ui: { kind: '...', props: {...} }`.
 *
 * Keep cards small, semantic, and styled with the project's design tokens
 * (--accent, --bg-card, --rule, etc.) — no Tailwind classes.
 */
import type { ComponentType } from 'react'

interface CommonProps { taskId?: string }

// ── GeoScoreCard ────────────────────────────────────────────────────────────

interface GeoScoreCardProps extends CommonProps {
  url: string
  score: number
  grade: string
  issues: Array<{ title: string; severity: 'high' | 'medium' | 'low'; fix_suggestion?: string }>
  geo_url: string
}

function GeoScoreCard({ url, score, grade, issues, geo_url, taskId }: GeoScoreCardProps) {
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#c0392b'
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: 16, background: 'var(--bg-elev)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 12, background: color, color: '#fff',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--serif)',
        }}>
          <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{grade}</div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            GEO audit
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginTop: 2, wordBreak: 'break-all' }}>
            {url.replace(/^https?:\/\//, '')}
          </div>
        </div>
      </div>
      {issues.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Top fixes ({issues.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {issues.slice(0, 3).map((iss, i) => {
              const sevColor = iss.severity === 'high' ? '#c0392b' : iss.severity === 'medium' ? '#d97706' : 'var(--ink-faint)'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13, lineHeight: 1.45 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: sevColor, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                    {iss.severity}
                  </span>
                  <span style={{ color: 'var(--ink)' }}>{iss.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
        <a href={geo_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
          View full audit →
        </a>
        {taskId && (
          <a href={`/gtm/tasks/${taskId}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-faint)', textDecoration: 'underline' }}>
            view task
          </a>
        )}
      </div>
    </div>
  )
}

// ── WorkspaceCard ───────────────────────────────────────────────────────────

interface WorkspaceCardProps extends CommonProps {
  name: string
  url: string
  one_liner?: string | null
  positioning?: string | null
  icp_summary?: string | null
  segments?: string[]
  key_messages?: string[]
  competitors?: string[]
  voice_summary?: string | null
  missing?: string[]
}

function WorkspaceCard(p: WorkspaceCardProps) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: 16, background: 'var(--bg-elev)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{p.name}</div>
        <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
          {p.url.replace(/^https?:\/\//, '')} ↗
        </a>
      </div>
      {p.one_liner && (
        <div style={{ fontSize: 13.5, color: 'var(--ink-dim)', fontStyle: 'italic', marginBottom: 12, paddingLeft: 10, borderLeft: '2px solid var(--rule)' }}>
          {p.one_liner}
        </div>
      )}
      <Field label="Positioning" value={p.positioning} />
      <Field label="ICP" value={p.icp_summary} />
      <Field label="Segments" value={p.segments?.join(' · ')} />
      <Field label="Key messages" value={p.key_messages?.slice(0, 3).join(' · ')} />
      <Field label="Competitors" value={p.competitors?.join(', ')} />
      <Field label="Voice" value={p.voice_summary} />
      {p.missing && p.missing.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-dim)' }}>
          <strong>Missing:</strong> {p.missing.join(', ')} — fill these in to unlock more agents.
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 95, flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{value}</div>
    </div>
  )
}

// ── ScheduledPostCard ─────────────────────────────────────────────────────--

interface ScheduledPostCardProps extends CommonProps {
  summary: string
  posts: Array<{ platform: string; content: string; scheduled_for: string | null; status: string }>
  scheduler_url: string
}

const PLATFORM_DOT: Record<string, string> = {
  x: '#000', linkedin: '#0a66c2', reddit: '#ff4500', mastodon: '#6364ff',
  bluesky: '#0085ff', instagram: '#e4405f', tiktok: '#000', threads: '#000',
  facebook: '#1877f2', youtube: '#ff0000', discord: '#5865f2', telegram: '#26a5e4',
}

function ScheduledPostCard({ summary, posts, scheduler_url }: ScheduledPostCardProps) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: 16, background: 'var(--bg-elev)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Scheduler
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 12, lineHeight: 1.5 }}>{summary}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {posts.map((p, i) => {
          const dot = PLATFORM_DOT[p.platform] || 'var(--ink-faint)'
          const when = p.scheduled_for ? new Date(p.scheduled_for).toLocaleString() : 'now'
          const statusColor = p.status === 'posted' ? '#16a34a' : p.status === 'failed' ? '#c0392b' : '#d97706'
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', border: '1px solid var(--rule)', borderRadius: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 12.5, textTransform: 'capitalize' }}>{p.platform}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{when}</span>
                  <span style={{ fontSize: 10.5, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.status}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.content}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 12.5 }}>
        <a href={scheduler_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
          Open Scheduler →
        </a>
      </div>
    </div>
  )
}

// ── registry ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CARDS: Record<string, ComponentType<any>> = {
  geo_score: GeoScoreCard,
  workspace: WorkspaceCard,
  scheduled_post: ScheduledPostCard,
}

interface AgentCardProps {
  kind: string
  props: Record<string, unknown>
  taskId?: string
}

export function AgentCard({ kind, props, taskId }: AgentCardProps) {
  const C = CARDS[kind]
  if (!C) return null
  return <C {...props} taskId={taskId} />
}
