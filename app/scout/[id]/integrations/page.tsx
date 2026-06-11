'use client'
/**
 * /scout/[id]/integrations — connect publishing accounts (V2 batch B).
 * OAuth flows are the existing /api/connect/[platform] routes; we pass
 * returnTo so the user lands back here with ?connect=connected|error.
 */
import { use, useCallback, useEffect, useState } from 'react'
import { LeftRail, btnPrimary } from '../../ui'

interface PlatformState {
  platform: string
  connected: boolean
  connection_id: string | null
  handle: string | null
  needs_reconnect: boolean
}

const PLATFORM_INFO: Record<string, { name: string; icon: string; blurb: string }> = {
  x: { name: 'X (Twitter)', icon: '𝕏', blurb: 'Threads and posts, scheduled straight from the queue.' },
  linkedin: { name: 'LinkedIn', icon: 'in', blurb: 'Personal or company-page posts for the professional crowd.' },
  reddit: { name: 'Reddit', icon: '◓', blurb: 'Community-native posts — Scout targets the right subreddit.' },
}

export default function ScoutIntegrations({ params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = use(params)
  const [platforms, setPlatforms] = useState<PlatformState[]>([])
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/scout/integrations?ws=${workspaceId}`)
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(`/scout/${workspaceId}/integrations`)}`
      return
    }
    if (res.ok) setPlatforms((await res.json()).platforms || [])
  }, [workspaceId])

  useEffect(() => {
    void refresh()
    const q = new URLSearchParams(window.location.search)
    const status = q.get('connect')
    if (status) {
      setBanner(status === 'connected'
        ? { kind: 'ok', text: 'Connected! Scout can publish here now. 🐾' }
        : { kind: 'err', text: q.get('msg') || 'Connection failed — try again.' })
      window.history.replaceState(null, '', `/scout/${workspaceId}/integrations`)
    }
  }, [refresh, workspaceId])

  function connect(platform: string) {
    const returnTo = encodeURIComponent(`/scout/${workspaceId}/integrations`)
    window.location.href = `/api/connect/${platform}?ws=${workspaceId}&returnTo=${returnTo}`
  }

  async function disconnect(id: string) {
    await fetch(`/api/scout/integrations?ws=${workspaceId}&id=${id}`, { method: 'DELETE' })
    void refresh()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <LeftRail workspaceId={workspaceId} workspaceName="" active="integrations" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h1 className="serif" style={{ fontSize: 30, margin: '0 0 6px' }}>Integrations</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 22px' }}>
            Connect your accounts so I can publish approved posts and pull performance back. Each workspace has its own connections.
          </p>

          {banner && (
            <div
              style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 18, fontSize: 13.5,
                border: `1px solid ${banner.kind === 'ok' ? 'var(--accent-border)' : 'var(--rule-strong)'}`,
                background: banner.kind === 'ok' ? 'var(--accent-soft)' : 'var(--bg-elev)',
                color: banner.kind === 'ok' ? 'var(--ink)' : 'var(--warn)',
              }}
            >
              {banner.text}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
            {platforms.map(p => {
              const info = PLATFORM_INFO[p.platform] || { name: p.platform, icon: '·', blurb: '' }
              return (
                <div key={p.platform} style={{ border: '1px solid var(--rule)', borderRadius: 14, background: 'var(--bg-elev)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20, width: 30 }} aria-hidden>{info.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{info.name}</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.5, flex: 1 }}>{info.blurb}</p>
                  {p.connected ? (
                    <>
                      <div className="mono" style={{ fontSize: 12, color: p.needs_reconnect ? 'var(--warn)' : 'var(--ink-dim)' }}>
                        {p.needs_reconnect ? '⚠ needs reconnect' : `● ${p.handle ? `@${p.handle.replace(/^@/, '')}` : 'connected'}`}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {p.needs_reconnect && (
                          <button style={{ ...btnPrimary, fontSize: 12.5, padding: '6px 14px' }} onClick={() => connect(p.platform)}>Reconnect</button>
                        )}
                        {p.connection_id && (
                          <button
                            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--rule-strong)', background: 'transparent', color: 'var(--ink-dim)', cursor: 'pointer' }}
                            onClick={() => void disconnect(p.connection_id!)}
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <button style={{ ...btnPrimary, fontSize: 13, padding: '8px 16px' }} onClick={() => connect(p.platform)}>
                      Connect
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <p className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 22 }}>
            TikTok · Instagram · Pinterest · YouTube — coming via the long-tail publishing channel.
          </p>
        </div>
      </div>
    </div>
  )
}
