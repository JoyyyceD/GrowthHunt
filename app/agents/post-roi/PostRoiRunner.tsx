'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Workspace } from '@/lib/workspace/types'
import type { PostRoiDigest, TemplateGroup } from '@/lib/agents/post-roi'

type Phase = 'idle' | 'refreshing' | 'done' | 'error'

export function PostRoiRunner({ workspace, initialDigest }: { workspace: Workspace; initialDigest: PostRoiDigest | null }) {
  const [digest, setDigest] = useState<PostRoiDigest | null>(initialDigest)
  const [phase, setPhase] = useState<Phase>('idle')
  const [info, setInfo] = useState('')
  const [err, setErr] = useState('')

  async function refresh() {
    setPhase('refreshing'); setErr(''); setInfo('')
    try {
      const res = await fetch('/api/agents/post-roi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Refresh failed'); setPhase('error'); return }
      setDigest(data.digest as PostRoiDigest)
      setInfo(`Ingested ${data.ingest?.upserted ?? data.fetched ?? 0} posts. Digest covers ${data.digest.posts_count}.`)
      toast.success('ROI digest refreshed')
      setPhase('done')
    } catch (e) {
      setErr((e as Error).message); setPhase('error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={refresh} disabled={phase === 'refreshing'} style={{ background: phase === 'refreshing' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'refreshing' ? 'not-allowed' : 'pointer' }}>
          {phase === 'refreshing' ? 'Refreshing…' : 'Refresh now →'}
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>Cron auto-refreshes every Sunday 12:00 UTC.</span>
      </div>
      {info && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-dim)' }}>{info}</p>}
      {err && <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{err}</p>}

      {!digest ? (
        <div style={{ border: '1px dashed var(--rule-strong)', borderRadius: 12, padding: '32px 26px', textAlign: 'center', background: 'var(--bg-elev)' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)' }}>No digest yet — click <strong>Refresh now</strong> to ingest your last 90 days of posts.</p>
        </div>
      ) : (
        <>
          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 22px', background: 'var(--bg-elev)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <div className="eyebrow"><span className="dot" />Week of {digest.weekStarting}</div>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>· {digest.posts_count} posts analyzed</span>
            </div>
            {digest.recommendations.length > 0 && (
              <ol style={{ margin: '6px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {digest.recommendations.map((r, i) => (
                  <li key={i} style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>{r}</li>
                ))}
              </ol>
            )}
          </div>

          <TemplateColumn title="Top templates" tone="up" groups={digest.top_templates} />
          <TemplateColumn title="Bottom templates" tone="down" groups={digest.bottom_templates} />
        </>
      )}
    </div>
  )
}

function TemplateColumn({ title, tone, groups }: { title: string; tone: 'up' | 'down'; groups: TemplateGroup[] }) {
  if (groups.length === 0) return null
  const color = tone === 'up' ? '#16a34a' : '#c0392b'
  const bg = tone === 'up' ? 'rgba(22,163,74,0.10)' : 'rgba(192,57,43,0.10)'
  return (
    <div style={{ border: `1px solid ${tone === 'up' ? 'rgba(22,163,74,0.25)' : 'rgba(192,57,43,0.25)'}`, borderRadius: 12, padding: '18px 22px', background: bg }}>
      <div className="eyebrow" style={{ marginBottom: 10, color }}>
        <span className="dot" style={{ background: color }} />{title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map((g, i) => (
          <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color }}>avg {Math.round(g.avg_engagement)} eng · {g.posts_count} posts · {Math.round(g.avg_likes)} avg likes</span>
            </div>
            <code style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-faint)', wordBreak: 'break-word', marginBottom: 8 }}>
              {g.skeleton.slice(0, 200)}{g.skeleton.length > 200 ? '…' : ''}
            </code>
            {g.best_example && (
              <a href={g.best_example.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'none', fontStyle: 'italic', borderLeft: `3px solid ${color}`, paddingLeft: 10 }}>
                &ldquo;{g.best_example.text.slice(0, 240)}{g.best_example.text.length > 240 ? '…' : ''}&rdquo;
                <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>view tweet ↗</span>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
