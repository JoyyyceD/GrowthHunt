'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { LaunchCampaign, LaunchPlatform } from '@/lib/agents/launch-orchestrator'

const PLATFORM_LABEL: Record<LaunchPlatform, string> = {
  product_hunt: 'Product Hunt', hacker_news: 'Hacker News', beta_list: 'BetaList',
  indie_hackers: 'Indie Hackers', reddit: 'Reddit', smol: 'Smol',
}
const PLATFORM_COLOR: Record<LaunchPlatform, string> = {
  product_hunt: '#da552f', hacker_news: '#ff6600', beta_list: '#5046e5',
  indie_hackers: '#0e74b8', reddit: '#ff4500', smol: '#000',
}

interface ChecklistItem { id: string; label: string; deep_link?: string; tip?: string; done?: boolean }
interface PlatformChecklist {
  platform: LaunchPlatform
  pre_launch: ChecklistItem[]
  launch_day: ChecklistItem[]
  post_launch: ChecklistItem[]
}

function pct(c: PlatformChecklist): number {
  const all = [...c.pre_launch, ...c.launch_day, ...c.post_launch]
  if (all.length === 0) return 0
  return Math.round(all.filter((x) => x.done).length / all.length * 100)
}

export function CampaignWorkspace({ campaign }: { campaign: LaunchCampaign }) {
  const [checklist, setChecklist] = useState<PlatformChecklist[]>(campaign.checklist)
  const [tab, setTab] = useState<'checklist' | 'copy' | 'timing'>('checklist')
  const [saving, setSaving] = useState(false)

  async function persist(next: PlatformChecklist[]) {
    setSaving(true)
    try {
      await fetch(`/api/agents/launch-orchestrator/${campaign.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: next }),
      })
    } finally { setSaving(false) }
  }

  function toggleItem(plat: LaunchPlatform, phase: 'pre_launch' | 'launch_day' | 'post_launch', itemId: string) {
    const next = checklist.map((c) => {
      if (c.platform !== plat) return c
      return { ...c, [phase]: c[phase].map((it) => it.id === itemId ? { ...it, done: !it.done } : it) } as PlatformChecklist
    })
    setChecklist(next)
    void persist(next)
  }

  function copyText(text: string) {
    try { navigator.clipboard.writeText(text); toast.success('Copied') } catch { /* noop */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['checklist', 'copy', 'timing'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{ background: tab === t ? 'var(--ink)' : 'transparent', color: tab === t ? 'var(--bg)' : 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '6px 14px', fontSize: 13, cursor: 'pointer', textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
        {saving && <span style={{ fontSize: 12, color: 'var(--ink-faint)', alignSelf: 'center' }}>Saving…</span>}
      </div>

      {tab === 'checklist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {checklist.map((c) => (
            <div key={c.platform} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 20px', background: 'var(--bg-elev)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#fff', background: PLATFORM_COLOR[c.platform], borderRadius: 4, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{PLATFORM_LABEL[c.platform]}</span>
                <div style={{ flex: 1, height: 4, background: 'var(--bg-card)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct(c)}%`, background: '#16a34a' }} />
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{pct(c)}%</span>
              </div>
              {(['pre_launch', 'launch_day', 'post_launch'] as const).map((phase) => (
                <div key={phase} style={{ marginBottom: 10 }}>
                  <div className="eyebrow" style={{ marginBottom: 6 }}><span className="dot" />{phase.replace('_', ' ')}</div>
                  {c[phase].map((it) => (
                    <label key={it.id} style={{ display: 'flex', gap: 8, padding: '6px 4px', cursor: 'pointer', borderRadius: 6 }}>
                      <input type="checkbox" checked={!!it.done} onChange={() => toggleItem(c.platform, phase, it.id)} style={{ marginTop: 4 }} />
                      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5, textDecoration: it.done ? 'line-through' : 'none', opacity: it.done ? 0.6 : 1 }}>
                        {it.label}
                        {it.deep_link && <> · <a href={it.deep_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>link ↗</a></>}
                        {it.tip && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{it.tip}</div>}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'copy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Object.entries(campaign.copy).map(([plat, payload]) => {
            const p = plat as LaunchPlatform
            return (
              <div key={p} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 20px', background: 'var(--bg-elev)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#fff', background: PLATFORM_COLOR[p], borderRadius: 4, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{PLATFORM_LABEL[p]}</span>
                </div>
                <CopyBlock data={payload} onCopy={copyText} />
              </div>
            )
          })}
        </div>
      )}

      {tab === 'timing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {campaign.timing.map((t) => (
            <div key={t.platform} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '14px 18px', background: 'var(--bg-elev)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#fff', background: PLATFORM_COLOR[t.platform], borderRadius: 4, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{PLATFORM_LABEL[t.platform]}</span>
                <span style={{ fontSize: 13, color: 'var(--ink)' }}><strong>{t.best_time_utc} UTC</strong> · {t.weekday}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5 }}>{t.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CopyBlock({ data, onCopy }: { data: unknown; onCopy: (t: string) => void }) {
  if (!data || typeof data !== 'object') return <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>No copy generated.</p>
  // Array of reddit posts
  if (Array.isArray(data)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(data as Array<{ subreddit?: string; title?: string; body?: string }>).map((post, i) => (
          <div key={i} style={{ borderTop: '1px solid var(--rule)', paddingTop: 10 }}>
            {post.subreddit && <p style={{ margin: '0 0 4px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>r/{post.subreddit}</p>}
            {post.title && <p style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>{post.title}</p>}
            {post.body && <pre style={{ margin: '0 0 8px', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--ink)' }}>{post.body}</pre>}
            <button type="button" onClick={() => onCopy(`${post.title || ''}\n\n${post.body || ''}`)} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Copy</button>
          </div>
        ))}
      </div>
    )
  }
  const obj = data as Record<string, string>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.replace(/_/g, ' ')}</span>
            <button type="button" onClick={() => onCopy(String(v || ''))} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '2px 10px', fontSize: 11, cursor: 'pointer' }}>Copy</button>
          </div>
          <pre style={{ margin: 0, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--ink)' }}>{String(v || '')}</pre>
        </div>
      ))}
    </div>
  )
}
