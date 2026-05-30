'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { PostizIntegration, ScheduledPost } from '@/lib/postiz/types'

interface WsLite { id: string; name: string }

interface NativeConn {
  id: string
  platform: string
  account_handle: string | null
  account_id: string | null
  scopes: string | null
  expires_at: string | null
  needs_reconnect: boolean
  reconnect_reason: string | null
}

interface Props {
  workspace: { id: string; name: string; url: string }
  allWorkspaces: WsLite[]
  initialConnected: boolean
  initialApiUrl: string
  initialIntegrations: PostizIntegration[]
  initialPosts: ScheduledPost[]
  initialNativeConnections: NativeConn[]
}

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  x: { label: 'X', color: '#000' },
  linkedin: { label: 'LinkedIn', color: '#0a66c2' },
  reddit: { label: 'Reddit', color: '#ff4500' },
  mastodon: { label: 'Mastodon', color: '#6364ff' },
  bluesky: { label: 'Bluesky', color: '#0085ff' },
  instagram: { label: 'Instagram', color: '#e4405f' },
  threads: { label: 'Threads', color: '#000' },
  tiktok: { label: 'TikTok', color: '#000' },
  facebook: { label: 'Facebook', color: '#1877f2' },
  youtube: { label: 'YouTube', color: '#ff0000' },
  discord: { label: 'Discord', color: '#5865f2' },
  telegram: { label: 'Telegram', color: '#26a5e4' },
}
function meta(platform: string) {
  return PLATFORM_META[platform] || { label: platform.charAt(0).toUpperCase() + platform.slice(1), color: 'var(--ink-faint)' }
}

const NATIVE_PLATFORMS = ['x', 'linkedin', 'reddit'] as const

const CARD: React.CSSProperties = { border: '1px solid var(--rule)', borderRadius: 12, padding: 18, background: 'var(--bg-elev)' }
const LABEL: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }
const INPUT: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 14, fontFamily: 'inherit' }
const BTN: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }
const BTN_GHOST: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--rule)', background: 'transparent', color: 'var(--ink-dim)', fontSize: 13, cursor: 'pointer' }

function statusColor(s: string) {
  return s === 'posted' ? '#16a34a' : s === 'failed' ? '#c0392b' : s === 'scheduled' ? '#d97706' : 'var(--ink-faint)'
}
function fmt(iso: string | null): string {
  if (!iso) return 'now'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

export function SchedulerRunner({ workspace, allWorkspaces, initialConnected, initialApiUrl, initialIntegrations, initialPosts, initialNativeConnections }: Props) {
  const router = useRouter()
  const search = useSearchParams()

  // postiz state
  const [postizConnected, setPostizConnected] = useState(initialConnected)
  const [apiUrl, setApiUrl] = useState(initialApiUrl)
  const [apiKey, setApiKey] = useState('')
  const [postizIntegrations, setPostizIntegrations] = useState<PostizIntegration[]>(initialIntegrations)
  const [showPostiz, setShowPostiz] = useState(false)

  // native state
  const [native, setNative] = useState<NativeConn[]>(initialNativeConnections)
  const [platformEnabled, setPlatformEnabled] = useState<Record<string, boolean>>({ x: true, linkedin: true, reddit: true })

  // shared
  const [posts, setPosts] = useState<ScheduledPost[]>(initialPosts)
  const [busy, setBusy] = useState(false)

  // compose state — now selecting by PLATFORM (string key), not integration id
  const [content, setContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [when, setWhen] = useState('')
  const [composing, setComposing] = useState(false)

  // Surface connect-callback result from URL.
  useEffect(() => {
    const status = search.get('connect')
    const msg = search.get('msg')
    if (status === 'connected') toast.success(msg ? `Connected ${msg}` : 'Connected')
    else if (status === 'error') toast.error(msg || 'Connection failed')
    if (status) {
      // Clean the params so a refresh doesn't re-fire the toast.
      router.replace(`/agents/scheduler?ws=${workspace.id}`)
      void refreshNative()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Load which platforms are enabled (admin has set OAuth creds).
  useEffect(() => {
    fetch('/api/social/platform-status').then((r) => r.json()).then((j) => {
      if (j?.enabled) setPlatformEnabled(j.enabled)
    }).catch(() => { /* fall back to all-enabled */ })
  }, [])

  const postizEnabled = useMemo(() => postizIntegrations.filter((i) => !i.disabled), [postizIntegrations])
  const queued = useMemo(() => posts.filter((p) => p.status === 'scheduled'), [posts])
  const history = useMemo(() => posts.filter((p) => p.status !== 'scheduled'), [posts])

  const nativeByPlatform = useMemo(() => {
    const m: Record<string, NativeConn> = {}
    for (const c of native) if (!m[c.platform]) m[c.platform] = c
    return m
  }, [native])

  // Platforms available for compose = native-connected + postiz-enabled.
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>()
    for (const c of native) if (!c.needs_reconnect) set.add(c.platform)
    for (const i of postizEnabled) set.add(i.platform)
    return Array.from(set).sort()
  }, [native, postizEnabled])

  function togglePlatform(p: string) {
    setSelectedPlatforms((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))
  }

  // ── native connect actions ────────────────────────────────────────────────
  function connectNative(platform: string) {
    window.location.href = `/api/connect/${platform}?ws=${workspace.id}`
  }

  async function refreshNative() {
    try {
      const res = await fetch(`/api/social/connections?ws=${workspace.id}`)
      const j = await res.json()
      if (res.ok) setNative(j.connections || [])
    } catch { /* noop */ }
  }

  async function disconnectNative(connId: string) {
    if (!confirm('Disconnect this account?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/social/connections?id=${connId}&ws=${workspace.id}`, { method: 'DELETE' })
      if (res.ok) {
        setNative((s) => s.filter((c) => c.id !== connId))
        toast.success('Disconnected')
      }
    } finally { setBusy(false) }
  }

  // ── postiz actions ────────────────────────────────────────────────────────
  async function connectPostiz() {
    if (!apiKey.trim()) { toast.error('Paste your Postiz API key first'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/postiz/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, api_url: apiUrl.trim(), api_key: apiKey.trim() }),
      })
      const j = await res.json()
      if (!res.ok) { toast.error(j.error || 'Connection failed'); return }
      toast.success(`Connected — ${j.integrations} channel(s) found`)
      setPostizConnected(true)
      setApiKey('')
      await refreshPostizChannels()
    } finally { setBusy(false) }
  }

  async function disconnectPostiz() {
    if (!confirm('Disconnect Postiz from this workspace?')) return
    setBusy(true)
    try {
      await fetch(`/api/postiz/connection?ws=${workspace.id}`, { method: 'DELETE' })
      setPostizConnected(false)
      setPostizIntegrations([])
      toast.success('Disconnected')
    } finally { setBusy(false) }
  }

  async function refreshPostizChannels() {
    setBusy(true)
    try {
      const res = await fetch('/api/postiz/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id }),
      })
      const j = await res.json()
      if (!res.ok) { toast.error(j.error || 'Refresh failed'); return }
      setPostizIntegrations(j.integrations || [])
      toast.success(`${(j.integrations || []).length} channel(s)`)
    } finally { setBusy(false) }
  }

  // ── compose ───────────────────────────────────────────────────────────────
  async function refreshPosts() {
    const res = await fetch(`/api/postiz/posts?ws=${workspace.id}`)
    const j = await res.json()
    if (res.ok) setPosts(j.posts || [])
  }

  async function submit(immediate: boolean) {
    if (!content.trim()) { toast.error('Write something to post'); return }
    if (selectedPlatforms.length === 0) { toast.error('Pick at least one platform'); return }
    if (!immediate && !when) { toast.error('Pick a date/time, or use Post now'); return }
    setComposing(true)
    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          content: content.trim(),
          platforms: selectedPlatforms,
          when: immediate ? null : new Date(when).toISOString(),
        }),
      })
      const j = await res.json()
      if (!res.ok || !j.ok) { toast.error(j.summary || j.error || 'Failed'); return }
      toast.success(j.summary)
      setContent('')
      setSelectedPlatforms([])
      setWhen('')
      await refreshPosts()
    } finally { setComposing(false) }
  }

  const hasAnyConnection = native.length > 0 || postizConnected

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* workspace switcher */}
      {allWorkspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>Workspace:</span>
          <select
            value={workspace.id}
            onChange={(e) => router.push(`/agents/scheduler?ws=${e.target.value}`)}
            style={{ ...INPUT, width: 'auto', padding: '6px 10px' }}
          >
            {allWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      {/* ── Native connections (primary) ── */}
      <div style={CARD}>
        <div style={LABEL}>Connect your accounts</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {NATIVE_PLATFORMS.map((p) => {
            const m = meta(p)
            const conn = nativeByPlatform[p]
            if (conn) {
              return (
                <div key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 999, border: `1px solid ${conn.needs_reconnect ? '#c0392b' : m.color}`, background: 'var(--bg)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.label}</span>
                  {conn.account_handle && <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>· {conn.account_handle}</span>}
                  {conn.needs_reconnect && (
                    <button onClick={() => connectNative(p)} style={{ ...BTN_GHOST, padding: '3px 8px', fontSize: 11, color: '#c0392b', borderColor: '#c0392b' }} title={conn.reconnect_reason || ''}>
                      Reconnect
                    </button>
                  )}
                  <button onClick={() => disconnectNative(conn.id)} disabled={busy} style={{ ...BTN_GHOST, padding: '3px 8px', fontSize: 11 }}>×</button>
                </div>
              )
            }
            const enabled = platformEnabled[p] !== false
            return (
              <button
                key={p}
                onClick={() => enabled ? connectNative(p) : toast.message(`${m.label} sign-in isn't enabled yet on this site.`)}
                disabled={!enabled}
                title={enabled ? '' : 'Not enabled by the site admin yet'}
                style={{
                  ...BTN_GHOST,
                  borderColor: enabled ? m.color : 'var(--rule)',
                  color: enabled ? m.color : 'var(--ink-faint)',
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  opacity: enabled ? 1 : 0.55,
                }}
              >
                {enabled ? `Connect with ${m.label} →` : `${m.label} · coming soon`}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
          OAuth through GrowthHunt — tokens stay in your workspace, never on a third-party server.
        </div>
      </div>

      {/* ── Compose ── */}
      {hasAnyConnection && (
        <div style={CARD}>
          <div style={LABEL}>Compose</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want to post? Pick platforms, time, then schedule."
            rows={4}
            style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5 }}
          />
          {availablePlatforms.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {availablePlatforms.map((p) => {
                const m = meta(p)
                const on = selectedPlatforms.includes(p)
                return (
                  <button key={p} onClick={() => togglePlatform(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999,
                      border: `1px solid ${on ? m.color : 'var(--rule)'}`,
                      background: on ? m.color : 'transparent',
                      color: on ? '#fff' : 'var(--ink-dim)', fontSize: 12, cursor: 'pointer',
                    }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? '#fff' : m.color }} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
              {content.length} chars · {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? '' : 's'} selected
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              style={{ ...INPUT, width: 'auto' }}
            />
            <button style={{ ...BTN, opacity: composing ? 0.6 : 1 }} disabled={composing} onClick={() => submit(false)}>
              {composing ? 'Scheduling…' : 'Schedule'}
            </button>
            <button style={{ ...BTN_GHOST, opacity: composing ? 0.6 : 1 }} disabled={composing} onClick={() => submit(true)}>
              Post now
            </button>
          </div>
        </div>
      )}

      {/* ── queue ── */}
      <div style={CARD}>
        <div style={LABEL}>Upcoming queue ({queued.length})</div>
        {queued.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>Nothing scheduled yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {queued.map((p) => <PostRow key={p.id} post={p} />)}
          </div>
        )}
      </div>

      {/* ── history ── */}
      {history.length > 0 && (
        <div style={CARD}>
          <div style={LABEL}>Recent ({history.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 30).map((p) => <PostRow key={p.id} post={p} />)}
          </div>
        </div>
      )}

      {/* ── Postiz (secondary / long-tail) ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowPostiz((s) => !s)}>
          <div style={{ ...LABEL, margin: 0 }}>Postiz (optional · long-tail platforms)</div>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{showPostiz ? '▾' : '▸'} {postizConnected ? `${postizEnabled.length} channels` : 'not connected'}</span>
        </div>
        {showPostiz && (
          <div style={{ marginTop: 12 }}>
            {!postizConnected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4 }}>Postiz API base URL</div>
                  <input style={INPUT} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://your-postiz-host/api/public/v1" />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4 }}>API key</div>
                  <input style={INPUT} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="paste your Postiz API key" />
                </div>
                <button style={{ ...BTN, opacity: busy ? 0.6 : 1, alignSelf: 'flex-start' }} disabled={busy} onClick={connectPostiz}>
                  {busy ? 'Verifying…' : 'Connect & verify'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button style={BTN_GHOST} disabled={busy} onClick={refreshPostizChannels}>{busy ? '…' : 'Refresh'}</button>
                  <button style={BTN_GHOST} disabled={busy} onClick={disconnectPostiz}>Disconnect</button>
                </div>
                {postizEnabled.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>No channels in Postiz yet — add accounts there, then Refresh.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {postizEnabled.map((i) => {
                      const m = meta(i.platform)
                      return (
                        <span key={i.integration_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, border: `1px solid ${m.color}`, fontSize: 11.5, color: 'var(--ink-dim)' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
                          {m.label}{i.name ? ` · ${i.name}` : ''}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PostRow({ post }: { post: ScheduledPost }) {
  const m = meta(post.platform)
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 11px', border: '1px solid var(--rule)', borderRadius: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 12.5 }}>{m.label}</span>
          <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{fmt(post.scheduled_for)}</span>
          <span style={{ fontSize: 10.5, color: statusColor(post.status), textTransform: 'uppercase', letterSpacing: '0.04em' }}>{post.status}</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</div>
        {post.error && <div style={{ fontSize: 11.5, color: '#c0392b', marginTop: 4 }}>⚠ {post.error}</div>}
      </div>
    </div>
  )
}
