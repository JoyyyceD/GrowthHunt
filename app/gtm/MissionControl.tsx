'use client'

import Link from 'next/link'
import type { Workspace } from '@/lib/workspace/types'
import type { GtmTask, TaskKind } from '@/lib/orchestrator/types'

const KIND_LABEL: Record<TaskKind, string> = {
  icp: 'ICP', voice: 'Voice', landing: 'Landing', creator_outreach: 'Creator',
  cold_email: 'Cold Email', distribution: 'Distribution', radar: 'Radar',
  ab: 'A/B', competitor: 'Competitor', geo_audit: 'GEO', playbook: 'Playbook',
  chat_turn: 'Chat',
}

const KIND_COLOR: Record<TaskKind, string> = {
  icp: '#0a66c2', voice: '#a855f7', landing: '#16a34a', creator_outreach: '#e84e1b',
  cold_email: '#3b82f6', distribution: '#f59e0b', radar: '#ff4500',
  ab: '#06b6d4', competitor: '#c0392b', geo_audit: '#16a34a', playbook: '#000',
  chat_turn: '#999',
}

function statusGlyph(s: GtmTask['status']): string {
  if (s === 'succeeded') return '✓'
  if (s === 'failed') return '✗'
  if (s === 'running') return '…'
  if (s === 'awaiting_user') return '?'
  return '·'
}

function timeAgo(iso: string): string {
  const d = (Date.now() - Date.parse(iso)) / 1000
  if (d < 60) return `${Math.round(d)}s ago`
  if (d < 3600) return `${Math.round(d / 60)}m ago`
  if (d < 86_400) return `${Math.round(d / 3600)}h ago`
  return `${Math.round(d / 86_400)}d ago`
}

/** Derive 3-5 "next actions" from workspace state + recent task results. */
function deriveActions(ws: Workspace, tasks: GtmTask[]): Array<{ text: string; href: string }> {
  const out: Array<{ text: string; href: string }> = []
  if (!ws.icp_summary) out.push({ text: 'Draft your ICP', href: `/agents/icp?ws=${ws.id}` })
  if (!ws.voice) out.push({ text: 'Train your voice', href: `/agents/voice?ws=${ws.id}` })
  if (!ws.positioning) out.push({ text: 'Write a positioning statement', href: `/agents/icp?ws=${ws.id}` })
  if ((ws.competitors?.length ?? 0) === 0) out.push({ text: 'Add competitors to watch', href: `/workspace/${ws.id}` })

  const lastLanding = tasks.find((t) => t.kind === 'landing' && t.status === 'succeeded')
  if (!lastLanding) out.push({ text: 'Run a landing-page audit', href: `/agents/landing?ws=${ws.id}` })

  const lastGeo = tasks.find((t) => t.kind === 'geo_audit' && t.status === 'succeeded')
  if (!lastGeo) out.push({ text: 'Run a GEO audit', href: `/geo?url=${encodeURIComponent(ws.url)}` })

  const lastRadar = tasks.find((t) => t.kind === 'radar' && t.status === 'succeeded')
  if (!lastRadar) out.push({ text: 'Scan Reddit + HN for ICP-match posts', href: `/agents/radar?ws=${ws.id}` })

  out.push({ text: 'Connect an account & schedule a post', href: `/agents/scheduler?ws=${ws.id}` })

  return out.slice(0, 5)
}

export function MissionControl({ workspace, tasks }: { workspace: Workspace; tasks: GtmTask[] }) {
  const actions = deriveActions(workspace, tasks)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {actions.length > 0 && (
        <div style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', borderRadius: 12, padding: '14px 16px' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Next actions</div>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actions.map((a, i) => (
              <li key={i} style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                <Link href={a.href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink)', textDecoration: 'none' }}>{a.text} →</Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '14px 16px', background: 'var(--bg-elev)' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Recent runs</div>
        {tasks.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)' }}>No agent runs yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasks.slice(0, 10).map((t) => (
              <Link key={t.id} href={`/gtm/tasks/${t.id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, fontSize: 12.5, color: 'var(--ink-dim)', textDecoration: 'none' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '1px 5px', borderRadius: 3, background: KIND_COLOR[t.kind], color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{KIND_LABEL[t.kind] || t.kind}</span>
                <span style={{ fontSize: 11, color: t.status === 'succeeded' ? '#16a34a' : t.status === 'failed' ? '#c0392b' : 'var(--ink-faint)' }}>{statusGlyph(t.status)}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.summary || t.kind}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)' }}>{timeAgo(t.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
