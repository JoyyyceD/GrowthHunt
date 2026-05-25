'use client'

import { useState } from 'react'
import type { Workspace } from '@/lib/workspace/types'
import type { DistributionPost, PlatformId, PlatformVariant } from '@/lib/agents/distribution'

type Phase = 'idle' | 'running' | 'done' | 'error'

const PLATFORM_META: Record<PlatformId, { label: string; color: string; emoji: string }> = {
  x:             { label: 'X',              color: '#000', emoji: '𝕏' },
  linkedin:      { label: 'LinkedIn',       color: '#0a66c2', emoji: 'in' },
  linkedin_long: { label: 'LinkedIn (long)', color: '#0a66c2', emoji: 'in+' },
  reddit:        { label: 'Reddit',         color: '#ff4500', emoji: 'r' },
  hackernews:    { label: 'HackerNews',     color: '#ff6600', emoji: 'Y' },
  instagram:     { label: 'Instagram',      color: '#e4405f', emoji: 'IG' },
  tiktok:        { label: 'TikTok',         color: '#000', emoji: 'TT' },
  discord:       { label: 'Discord',        color: '#5865f2', emoji: 'd' },
  xiaohongshu:   { label: '小红书',          color: '#fe2c55', emoji: '🍠' },
}
const PLATFORM_ORDER: PlatformId[] = ['x', 'linkedin', 'linkedin_long', 'reddit', 'hackernews', 'instagram', 'tiktok', 'discord', 'xiaohongshu']

function variantToText(v: PlatformVariant): string {
  const out: string[] = []
  if (v.title) out.push(`# ${v.title}`)
  if (v.subreddit) out.push(`(suggested: r/${v.subreddit})`)
  if (v.threadParts && v.threadParts.length > 0) {
    out.push(v.threadParts.map((p, i) => `${i + 1}/${v.threadParts!.length}\n${p}`).join('\n\n'))
  } else if (v.body) {
    out.push(v.body)
  }
  if (v.hashtags && v.hashtags.length > 0) out.push(v.hashtags.map((h) => h.startsWith('#') ? h : `#${h}`).join(' '))
  return out.join('\n\n')
}

function platformUrl(p: PlatformId, v: PlatformVariant): string | null {
  switch (p) {
    case 'x': {
      const text = encodeURIComponent(v.threadParts?.[0] || v.body)
      return `https://x.com/intent/tweet?text=${text}`
    }
    case 'linkedin':      return 'https://www.linkedin.com/feed/?shareActive=true'
    case 'linkedin_long': return 'https://www.linkedin.com/article/new/'
    case 'reddit':        return v.subreddit ? `https://www.reddit.com/r/${v.subreddit}/submit` : 'https://www.reddit.com/submit'
    case 'hackernews':    return 'https://news.ycombinator.com/submit'
    case 'instagram':     return null
    case 'tiktok':        return 'https://www.tiktok.com/upload'
    case 'discord':       return null
    case 'xiaohongshu':   return 'https://creator.xiaohongshu.com/publish/publish'
    default: return null
  }
}

export function DistributionRunner({ workspace, allWorkspaces, initialPosts }: { workspace: Workspace; allWorkspaces: Workspace[]; initialPosts: DistributionPost[] }) {
  const [topic, setTopic] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [picked, setPicked] = useState<Set<PlatformId>>(new Set(PLATFORM_ORDER))
  const [phase, setPhase] = useState<Phase>('idle')
  const [posts, setPosts] = useState<DistributionPost[]>(initialPosts)
  const [active, setActive] = useState<DistributionPost | null>(initialPosts[0] || null)
  const [err, setErr] = useState('')

  function togglePlatform(p: PlatformId) {
    setPicked((cur) => {
      const next = new Set(cur)
      if (next.has(p)) next.delete(p); else next.add(p)
      return next
    })
  }

  async function run() {
    if (!topic.trim()) return
    setPhase('running'); setErr('')
    try {
      const res = await fetch('/api/agents/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          topic: topic.trim(),
          source_url: sourceUrl.trim() || undefined,
          platforms: Array.from(picked),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.post) { setErr(data.notes || data.error || 'Generation failed.'); setPhase('error'); return }
      setPosts((prev) => [data.post as DistributionPost, ...prev])
      setActive(data.post as DistributionPost)
      setPhase('done')
    } catch { setErr('Network error.'); setPhase('error') }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard blocked */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {allWorkspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Workspace:</span>
          <select value={workspace.id} onChange={(e) => { window.location.href = `/agents/distribution?ws=${e.target.value}` }} style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
            {allWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)' }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Canonical post (what you want to say)</label>
        <textarea
          rows={4}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Launching GrowthHunt Creator Outreach today — finds creators ≤10k followers your buyers trust, drafts personalized X DMs in your voice. Free."
          style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none', resize: 'vertical' }}
        />
        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', margin: '12px 0 6px', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source URL (optional)</label>
        <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="growthhunt.ai/agents/creator" style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '14px 0' }}>
          {PLATFORM_ORDER.map((p) => (
            <button key={p} type="button" onClick={() => togglePlatform(p)}
                    style={{ background: picked.has(p) ? PLATFORM_META[p].color : 'transparent', color: picked.has(p) ? '#fff' : 'var(--ink-dim)', border: `1px solid ${picked.has(p) ? PLATFORM_META[p].color : 'var(--rule-strong)'}`, borderRadius: 999, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
              {PLATFORM_META[p].label}
            </button>
          ))}
        </div>
        <button type="button" onClick={run} disabled={phase === 'running' || picked.size === 0} style={{ background: phase === 'running' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'running' ? 'not-allowed' : 'pointer' }}>
          {phase === 'running' ? 'Generating…' : `Generate ${picked.size} variants →`}
        </button>
        {phase === 'running' && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-dim)' }}>Per-platform rewrites + cadence plan. 20-40 seconds.</p>}
        {err && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c0392b' }}>{err}</p>}
      </div>

      {posts.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', alignSelf: 'center' }}>HISTORY:</span>
          {posts.slice(0, 8).map((p) => (
            <button key={p.id} type="button" onClick={() => setActive(p)} style={{ background: active?.id === p.id ? 'var(--ink)' : 'transparent', color: active?.id === p.id ? 'var(--bg)' : 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '4px 12px', fontSize: 12, cursor: 'pointer', maxWidth: 240, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {p.topic.slice(0, 38)}{p.topic.length > 38 ? '…' : ''}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {active.cadence?.length > 0 && (
            <div style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', borderRadius: 12, padding: '18px 22px' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Suggested cadence</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {[...active.cadence].sort((a, b) => a.post_at_offset_hours - b.post_at_offset_hours).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#fff', background: PLATFORM_META[c.platform]?.color || 'var(--ink)', borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{PLATFORM_META[c.platform]?.label}</span>
                    <span style={{ color: 'var(--ink)' }}>+{c.post_at_offset_hours}h</span>
                    {c.note && <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>· {c.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {PLATFORM_ORDER.map((p) => {
            const v = active.variants?.[p]
            if (!v) return null
            const fullText = variantToText(v)
            const composeUrl = platformUrl(p, v)
            return (
              <div key={p} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 20px', background: 'var(--bg-elev)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#fff', background: PLATFORM_META[p].color, borderRadius: 4, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{PLATFORM_META[p].label}</span>
                  {v.notes && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{v.notes}</span>}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => copy(fullText)} style={{ background: 'transparent', color: 'var(--ink)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>Copy</button>
                    {composeUrl && (
                      <a href={composeUrl} target="_blank" rel="noopener noreferrer" style={{ background: PLATFORM_META[p].color, color: '#fff', border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        Compose →
                      </a>
                    )}
                  </div>
                </div>
                {v.title && <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 400, margin: '0 0 6px', letterSpacing: '-0.01em' }}>{v.title}</div>}
                {v.subreddit && <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginBottom: 8 }}>r/{v.subreddit}</div>}
                {v.threadParts && v.threadParts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {v.threadParts.map((part, i) => (
                      <div key={i} style={{ padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 10, fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{i + 1}/{v.threadParts!.length}</span>
                        <div>{part}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre style={{ margin: 0, padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 10, fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--ink)' }}>{v.body}</pre>
                )}
                {v.hashtags && v.hashtags.length > 0 && (
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
                    {v.hashtags.map((h) => h.startsWith('#') ? h : `#${h}`).join(' ')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
