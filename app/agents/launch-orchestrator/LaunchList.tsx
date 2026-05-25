'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { LaunchCampaign, LaunchPlatform } from '@/lib/agents/launch-orchestrator'

const PLATFORMS: LaunchPlatform[] = ['product_hunt', 'hacker_news', 'beta_list', 'indie_hackers', 'reddit', 'smol']
const PLATFORM_LABEL: Record<LaunchPlatform, string> = {
  product_hunt: 'Product Hunt', hacker_news: 'Hacker News', beta_list: 'BetaList',
  indie_hackers: 'Indie Hackers', reddit: 'Reddit', smol: 'Smol',
}
const PLATFORM_COLOR: Record<LaunchPlatform, string> = {
  product_hunt: '#da552f', hacker_news: '#ff6600', beta_list: '#5046e5',
  indie_hackers: '#0e74b8', reddit: '#ff4500', smol: '#000',
}

export function LaunchList({ workspaceId, workspaceUrl, initialCampaigns }: { workspaceId: string; workspaceUrl: string; initialCampaigns: LaunchCampaign[] }) {
  const [list, setList] = useState<LaunchCampaign[]>(initialCampaigns)
  const [creating, setCreating] = useState(initialCampaigns.length === 0)
  const [name, setName] = useState('')
  const [url, setUrl] = useState(workspaceUrl)
  const [tagline, setTagline] = useState('')
  const [launchAt, setLaunchAt] = useState(() => {
    // default = next Tuesday 12:01am PT = 08:01 UTC (PST) or 07:01 (PDT). We pick 07:01 UTC default for now.
    const d = new Date()
    while (d.getUTCDay() !== 2) d.setUTCDate(d.getUTCDate() + 1)
    d.setUTCHours(7, 1, 0, 0)
    const off = d.getTimezoneOffset()
    return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16)
  })
  const [picked, setPicked] = useState<Set<LaunchPlatform>>(new Set(['product_hunt', 'hacker_news', 'indie_hackers']))
  const [phase, setPhase] = useState<'idle' | 'creating'>('idle')
  const [err, setErr] = useState('')

  function togglePlatform(p: LaunchPlatform) {
    setPicked((cur) => { const n = new Set(cur); if (n.has(p)) n.delete(p); else n.add(p); return n })
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim() || picked.size === 0) return
    setPhase('creating'); setErr('')
    try {
      const res = await fetch('/api/agents/launch-orchestrator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: name.trim(),
          product_url: url.trim(),
          tagline: tagline.trim() || undefined,
          launch_at: new Date(launchAt).toISOString(),
          platforms: Array.from(picked),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.campaign) { setErr(data.error || 'Create failed'); return }
      setList((prev) => [data.campaign as LaunchCampaign, ...prev])
      setCreating(false)
      setName(''); setTagline('')
      toast.success('Campaign created with copy + checklists')
    } catch (e) { setErr((e as Error).message) } finally { setPhase('idle') }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)',
    borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit',
    color: 'var(--ink)', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {creating ? (
        <form onSubmit={create} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '22px 24px', background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, margin: 0 }}>New launch campaign</h2>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Product name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="GrowthHunt Mission Control" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Product URL</label>
            <input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://growthhunt.ai/gtm" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tagline (optional)</label>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="The all-in-one GTM agent" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Launch date/time (local)</label>
            <input type="datetime-local" value={launchAt} onChange={(e) => setLaunchAt(e.target.value)} style={inputStyle} />
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--ink-faint)' }}>Tip: Product Hunt timer starts 12:01am Pacific. Tue/Wed/Thu have lower competition than Mondays.</p>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platforms</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => togglePlatform(p)}
                        style={{ background: picked.has(p) ? PLATFORM_COLOR[p] : 'transparent', color: picked.has(p) ? '#fff' : 'var(--ink-dim)', border: `1px solid ${picked.has(p) ? PLATFORM_COLOR[p] : 'var(--rule-strong)'}`, borderRadius: 999, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
                  {PLATFORM_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={phase === 'creating' || picked.size === 0} style={{ background: phase === 'creating' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'creating' ? 'not-allowed' : 'pointer' }}>
              {phase === 'creating' ? 'Generating copy…' : 'Create campaign →'}
            </button>
            {list.length > 0 && (
              <button type="button" onClick={() => setCreating(false)} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '12px 18px', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>
          {err && <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{err}</p>}
        </form>
      ) : (
        <button type="button" onClick={() => setCreating(true)} style={{ background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
          + New launch campaign
        </button>
      )}

      {list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((c) => (
            <Link key={c.id} href={`/agents/launch-orchestrator/${c.id}`} style={{ display: 'block', border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 20px', background: 'var(--bg-elev)', textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', fontWeight: 400 }}>{c.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-card)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.status}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-dim)' }}>Launches {new Date(c.launch_at).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.platforms.map((p) => (
                  <span key={p} style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 7px', borderRadius: 3, background: PLATFORM_COLOR[p], color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{PLATFORM_LABEL[p]}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
