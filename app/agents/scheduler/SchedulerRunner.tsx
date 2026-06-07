'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { PostizIntegration, ScheduledPost } from '@/lib/postiz/types'
import type { MediaItem } from '@/lib/social/media'

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

interface XByoState { connected: boolean; screen_name: string | null }

interface Props {
  workspace: { id: string; name: string; url: string }
  allWorkspaces: WsLite[]
  initialConnected: boolean
  initialApiUrl: string
  initialIntegrations: PostizIntegration[]
  initialPosts: ScheduledPost[]
  initialNativeConnections: NativeConn[]
  initialXByo: XByoState
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

// Per-platform content limits (chars) — warn before the platform API rejects the post.
const PLATFORM_LIMITS: Record<string, number> = {
  x: 280, linkedin: 3000, reddit: 40000, mastodon: 500, bluesky: 300,
  threads: 500, instagram: 2200, tiktok: 2200, facebook: 63206,
  youtube: 5000, telegram: 4096, discord: 2000,
}

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

export function SchedulerRunner({ workspace, allWorkspaces, initialConnected, initialApiUrl, initialIntegrations, initialPosts, initialNativeConnections, initialXByo }: Props) {
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

  // X BYO state
  const [xByo, setXByo] = useState<XByoState>(initialXByo)
  const [xModalOpen, setXModalOpen] = useState(false)
  const [xCk, setXCk] = useState(''); const [xCs, setXCs] = useState('')
  const [xAt, setXAt] = useState(''); const [xAts, setXAts] = useState('')
  const [xSubmitting, setXSubmitting] = useState(false)

  // shared
  const [posts, setPosts] = useState<ScheduledPost[]>(initialPosts)
  const [busy, setBusy] = useState(false)

  // compose state — now selecting by PLATFORM (string key), not integration id
  const [content, setContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [when, setWhen] = useState('')
  const [composing, setComposing] = useState(false)
  // edit-in-place: when set, Compose acts on this scheduled post instead of creating new
  const [editingId, setEditingId] = useState<string | null>(null)

  // reddit targeting — only used when 'reddit' is among the selected platforms
  const [subreddit, setSubreddit] = useState('')
  const [redditTitle, setRedditTitle] = useState('')
  const [mySubreddits, setMySubreddits] = useState<Array<{ name: string; title: string; subscribers: number }>>([])

  // media attachments (images / video)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)

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

  // Platforms available for compose = native-connected (incl X BYO) + postiz-enabled.
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>()
    if (xByo.connected) set.add('x')
    for (const c of native) if (!c.needs_reconnect) set.add(c.platform)
    for (const i of postizEnabled) set.add(i.platform)
    return Array.from(set).sort()
  }, [xByo.connected, native, postizEnabled])

  function togglePlatform(p: string) {
    setSelectedPlatforms((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))
  }

  // Platforms whose limit the current draft exceeds (warn + block submit).
  const overLimit = useMemo(
    () => selectedPlatforms.filter((p) => PLATFORM_LIMITS[p] && content.length > PLATFORM_LIMITS[p]),
    [selectedPlatforms, content]
  )

  // Load the user's subreddits the first time Reddit is selected (for the target picker).
  const redditSelected = selectedPlatforms.includes('reddit')
  useEffect(() => {
    if (!redditSelected || mySubreddits.length > 0) return
    fetch(`/api/social/reddit/subreddits?ws=${workspace.id}`)
      .then((r) => r.json())
      .then((j) => { if (Array.isArray(j?.subreddits)) setMySubreddits(j.subreddits) })
      .catch(() => { /* picker is optional — manual entry still works */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redditSelected])

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

  async function submitXByo() {
    if (!xCk.trim() || !xCs.trim() || !xAt.trim() || !xAts.trim()) {
      toast.error('Fill all 4 keys')
      return
    }
    setXSubmitting(true)
    try {
      const res = await fetch('/api/viralx/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumer_key: xCk.trim(), consumer_secret: xCs.trim(),
          access_token: xAt.trim(), access_token_secret: xAts.trim(),
        }),
      })
      const j = await res.json()
      if (!res.ok) { toast.error(j.error || 'X verification failed'); return }
      toast.success(`Connected as @${j.x_screen_name}`)
      setXByo({ connected: true, screen_name: j.x_screen_name })
      setXCk(''); setXCs(''); setXAt(''); setXAts('')
      setXModalOpen(false)
    } finally { setXSubmitting(false) }
  }

  async function disconnectXByo() {
    if (!confirm('Disconnect your X account?')) return
    setBusy(true)
    try {
      await fetch('/api/viralx/credentials', { method: 'DELETE' })
      setXByo({ connected: false, screen_name: null })
      toast.success('X disconnected')
    } finally { setBusy(false) }
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

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (media.length + files.length > 4) { toast.error('Up to 4 attachments per post'); return }
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('ws', workspace.id)
        const res = await fetch('/api/social/media', { method: 'POST', body: fd })
        const j = await res.json()
        if (!res.ok || !j.ok) { toast.error(j.error || `Upload failed: ${file.name}`); continue }
        setMedia((m) => [...m, j.media as MediaItem])
      }
    } finally { setUploading(false) }
  }

  function removeMedia(item: MediaItem) {
    setMedia((m) => m.filter((x) => x.path !== item.path))
    // Best-effort cleanup of the stored object (ignore failures).
    fetch(`/api/social/media?path=${encodeURIComponent(item.path)}&ws=${workspace.id}`, { method: 'DELETE' }).catch(() => {})
  }

  async function submit(immediate: boolean) {
    if (!content.trim() && media.length === 0) { toast.error('Write something or attach media to post'); return }
    if (selectedPlatforms.length === 0) { toast.error('Pick at least one platform'); return }
    if (!immediate && !when) { toast.error('Pick a date/time, or use Post now'); return }
    if (uploading) { toast.error('Wait for the upload to finish'); return }
    if (overLimit.length > 0) {
      toast.error(`Too long for ${overLimit.map((p) => meta(p).label).join(', ')} — trim the text first.`)
      return
    }
    // Per-platform options. Reddit needs a target subreddit, else it falls back to your profile.
    const options: Record<string, Record<string, unknown>> = {}
    if (selectedPlatforms.includes('reddit')) {
      const sr = subreddit.trim().replace(/^r\//, '')
      if (!sr) { toast.error('Pick a subreddit for the Reddit post.'); return }
      options.reddit = { subreddit: sr }
      if (redditTitle.trim()) options.reddit.title = redditTitle.trim()
    }
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
          options: Object.keys(options).length ? options : undefined,
          media: media.length ? media : undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok || !j.ok) { toast.error(j.summary || j.error || 'Failed'); return }
      toast.success(j.summary)
      setContent('')
      setSelectedPlatforms([])
      setWhen('')
      setSubreddit('')
      setRedditTitle('')
      setMedia([])
      await refreshPosts()
    } finally { setComposing(false) }
  }

  function discardEdit() {
    setEditingId(null)
    setContent('')
    setSelectedPlatforms([])
    setWhen('')
  }

  function startEdit(post: ScheduledPost) {
    setEditingId(post.id)
    setContent(post.content)
    setSelectedPlatforms([post.platform])
    // Convert ISO to <input type=datetime-local> value (local TZ, no seconds)
    if (post.scheduled_for) {
      const d = new Date(post.scheduled_for)
      const pad = (n: number) => String(n).padStart(2, '0')
      setWhen(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    } else {
      setWhen('')
    }
    // Scroll Compose into view (we're inside the page flow)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveEdit() {
    if (!editingId) return
    if (!content.trim()) { toast.error('Content cannot be empty'); return }
    if (!when) { toast.error('Pick a date/time'); return }
    if (overLimit.length > 0) {
      toast.error(`Too long for ${overLimit.map((p) => meta(p).label).join(', ')} — trim the text first.`)
      return
    }
    setComposing(true)
    try {
      const res = await fetch(`/api/social/posts/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          scheduled_for: new Date(when).toISOString(),
        }),
      })
      const j = await res.json()
      if (!res.ok) { toast.error(j.error || 'Save failed'); return }
      toast.success('Scheduled post updated')
      discardEdit()
      await refreshPosts()
    } finally { setComposing(false) }
  }

  async function cancelPost(id: string) {
    if (!confirm('Cancel this scheduled post?')) return
    const optimistic = posts.find((p) => p.id === id)
    setPosts((s) => s.map((p) => (p.id === id ? { ...p, status: 'canceled' } : p)))
    try {
      const res = await fetch(`/api/social/posts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j.error || 'Cancel failed')
        if (optimistic) setPosts((s) => s.map((p) => (p.id === id ? optimistic : p)))
        return
      }
      toast.success('Canceled')
      if (editingId === id) discardEdit()
    } catch (e) {
      toast.error((e as Error).message)
      if (optimistic) setPosts((s) => s.map((p) => (p.id === id ? optimistic : p)))
    }
  }

  async function retryPost(id: string) {
    try {
      const res = await fetch(`/api/social/posts/${id}/retry`, { method: 'POST' })
      const j = await res.json()
      if (!res.ok) { toast.error(j.error || 'Retry failed'); return }
      toast.success('Requeued — next cron run will publish it')
      await refreshPosts()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const hasAnyConnection = xByo.connected || native.length > 0 || postizConnected

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

            // ─── X: BYO mode (paste 4 keys) ───
            if (p === 'x') {
              if (xByo.connected) {
                return (
                  <div key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 999, border: `1px solid ${m.color}`, background: 'var(--bg)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.label}</span>
                    {xByo.screen_name && <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>· @{xByo.screen_name}</span>}
                    <button onClick={disconnectXByo} disabled={busy} style={{ ...BTN_GHOST, padding: '3px 8px', fontSize: 11 }}>×</button>
                  </div>
                )
              }
              return (
                <button key={p} onClick={() => setXModalOpen(true)} style={{ ...BTN_GHOST, borderColor: m.color, color: m.color }}>
                  Connect X (paste your API keys) →
                </button>
              )
            }

            // ─── LinkedIn / Reddit: shared OAuth ───
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
          X uses your own API keys (you pay X directly). LinkedIn / Reddit use OAuth through GrowthHunt — tokens stay in your workspace.
        </div>
      </div>

      {/* ── X BYO modal ── */}
      {xModalOpen && (
        <div onClick={() => !xSubmitting && setXModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-elev)', borderRadius: 14, padding: 24, maxWidth: 560, width: '100%', border: '1px solid var(--rule)' }}>
            <div style={{ ...LABEL, marginBottom: 6 }}>Connect X · BYO API keys</div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-dim)', lineHeight: 1.55, margin: '0 0 16px' }}>
              Paste the 4 OAuth 1.0a keys from <strong>your own</strong> X developer app. Posts to X are signed with your keys —
              X bills your account, not GrowthHunt. <a href="https://developer.x.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>How to get these →</a>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([
                ['Consumer Key (API Key)', xCk, setXCk],
                ['Consumer Secret (API Secret)', xCs, setXCs],
                ['Access Token', xAt, setXAt],
                ['Access Token Secret', xAts, setXAts],
              ] as Array<[string, string, (v: string) => void]>).map(([label, val, set], i) => (
                <div key={i}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 4 }}>{label}</div>
                  <input
                    type="password"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    style={INPUT}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button onClick={() => setXModalOpen(false)} disabled={xSubmitting} style={BTN_GHOST}>Cancel</button>
              <button onClick={submitXByo} disabled={xSubmitting} style={{ ...BTN, opacity: xSubmitting ? 0.6 : 1 }}>
                {xSubmitting ? 'Verifying…' : 'Verify & save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Compose ── */}
      {hasAnyConnection && (
        <div style={{ ...CARD, borderColor: editingId ? 'var(--accent)' : 'var(--rule)' }}>
          <div style={{ ...LABEL, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{editingId ? 'Editing scheduled post' : 'Compose'}</span>
            {editingId && (
              <button onClick={discardEdit} style={{ ...BTN_GHOST, padding: '3px 10px', fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>
                Discard
              </button>
            )}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want to post? Pick platforms, time, then schedule."
            rows={4}
            style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5 }}
          />
          {!editingId && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ ...BTN_GHOST, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: uploading || media.length >= 4 ? 'default' : 'pointer', opacity: uploading || media.length >= 4 ? 0.6 : 1 }}>
                  {uploading ? 'Uploading…' : '📎 Add image / video'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
                    multiple
                    disabled={uploading || media.length >= 4}
                    onChange={(e) => { void uploadFiles(e.target.files); e.currentTarget.value = '' }}
                    style={{ display: 'none' }}
                  />
                </label>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{media.length}/4 · jpg/png/webp/gif, mp4/mov</span>
              </div>
              {media.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {media.map((m) => (
                    <div key={m.path} style={{ position: 'relative', width: 76, height: 76, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--rule)', background: 'var(--bg)' }}>
                      {m.kind === 'video'
                        ? <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        : <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      <button onClick={() => removeMedia(m)} title="Remove" style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, lineHeight: '18px', cursor: 'pointer', padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {availablePlatforms.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {availablePlatforms.map((p) => {
                const m = meta(p)
                const on = selectedPlatforms.includes(p)
                const locked = !!editingId
                return (
                  <button key={p} onClick={() => !locked && togglePlatform(p)}
                    disabled={locked && !on}
                    title={locked ? "Platform can't be changed when editing — discard and recompose to switch." : ''}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999,
                      border: `1px solid ${on ? m.color : 'var(--rule)'}`,
                      background: on ? m.color : 'transparent',
                      color: on ? '#fff' : 'var(--ink-dim)', fontSize: 12,
                      cursor: locked && !on ? 'not-allowed' : 'pointer',
                      opacity: locked && !on ? 0.4 : 1,
                    }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? '#fff' : m.color }} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          )}
          {!editingId && redditSelected && (
            <div style={{ marginTop: 10, padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 8, background: 'var(--bg)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 6 }}>
                Reddit target — your post goes to this subreddit (not your profile)
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  list="reddit-subs"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  placeholder="subreddit (e.g. SaaS)"
                  style={{ ...INPUT, width: 'auto', flex: '1 1 180px' }}
                />
                <input
                  value={redditTitle}
                  onChange={(e) => setRedditTitle(e.target.value)}
                  placeholder="post title (optional — defaults to first line)"
                  style={{ ...INPUT, width: 'auto', flex: '2 1 240px' }}
                />
              </div>
              {mySubreddits.length > 0 && (
                <datalist id="reddit-subs">
                  {mySubreddits.map((s) => (
                    <option key={s.name} value={s.name}>{`r/${s.name} · ${s.subscribers.toLocaleString()} members`}</option>
                  ))}
                </datalist>
              )}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
              {content.length} chars · {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? '' : 's'} selected
            </span>
            {overLimit.length > 0 && (
              <span style={{ fontSize: 11.5, color: '#c0392b' }}>
                ⚠ Over limit for {overLimit.map((p) => `${meta(p).label} (${PLATFORM_LIMITS[p]})`).join(', ')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              style={{ ...INPUT, width: 'auto' }}
            />
            {editingId ? (
              <button style={{ ...BTN, opacity: composing || overLimit.length > 0 ? 0.6 : 1 }} disabled={composing || overLimit.length > 0} onClick={saveEdit}>
                {composing ? 'Saving…' : 'Save changes'}
              </button>
            ) : (
              <>
                <button style={{ ...BTN, opacity: composing || overLimit.length > 0 ? 0.6 : 1 }} disabled={composing || overLimit.length > 0} onClick={() => submit(false)}>
                  {composing ? 'Scheduling…' : 'Schedule'}
                </button>
                <button style={{ ...BTN_GHOST, opacity: composing || overLimit.length > 0 ? 0.6 : 1 }} disabled={composing || overLimit.length > 0} onClick={() => submit(true)}>
                  Post now
                </button>
              </>
            )}
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
            {queued.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                onEdit={() => startEdit(p)}
                onCancel={() => cancelPost(p.id)}
                isEditing={editingId === p.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── history ── */}
      {history.length > 0 && (
        <div style={CARD}>
          <div style={LABEL}>Recent ({history.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 30).map((p) => (
              <PostRow
                key={p.id}
                post={p}
                onRetry={p.status === 'failed' ? () => retryPost(p.id) : undefined}
              />
            ))}
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

function PostRow({ post, onEdit, onCancel, onRetry, isEditing }: {
  post: ScheduledPost
  onEdit?: () => void
  onCancel?: () => void
  onRetry?: () => void
  isEditing?: boolean
}) {
  const m = meta(post.platform)
  const actionBtn: React.CSSProperties = {
    padding: '3px 9px', fontSize: 11, borderRadius: 6, border: '1px solid var(--rule)',
    background: 'transparent', color: 'var(--ink-dim)', cursor: 'pointer',
  }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 11px', border: `1px solid ${isEditing ? 'var(--accent)' : 'var(--rule)'}`, borderRadius: 8, background: isEditing ? 'var(--bg)' : 'transparent' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 12.5 }}>{m.label}</span>
          <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{fmt(post.scheduled_for)}</span>
          <span style={{ fontSize: 10.5, color: statusColor(post.status), textTransform: 'uppercase', letterSpacing: '0.04em' }}>{post.status}</span>
          {isEditing && <span style={{ fontSize: 10.5, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>· editing above</span>}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</div>
        {post.media && post.media.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>📎 {post.media.length} attachment{post.media.length === 1 ? '' : 's'}</div>
        )}
        {post.error && <div style={{ fontSize: 11.5, color: '#c0392b', marginTop: 4 }}>⚠ {post.error}</div>}
      </div>
      {(onEdit || onCancel || onRetry) && (
        <div style={{ display: 'flex', gap: 6, alignSelf: 'center', flexShrink: 0 }}>
          {onRetry && <button onClick={onRetry} style={actionBtn} title="Requeue for next cron run">↻ Retry</button>}
          {onEdit && <button onClick={onEdit} style={actionBtn} disabled={isEditing} title="Edit content or time">✎ Edit</button>}
          {onCancel && <button onClick={onCancel} style={{ ...actionBtn, color: '#c0392b' }} title="Cancel this scheduled post">× Cancel</button>}
        </div>
      )}
    </div>
  )
}
