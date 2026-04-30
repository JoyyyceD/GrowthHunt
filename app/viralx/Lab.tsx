'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { TweetCard, type TweetCardData } from './TweetCard'

interface Stats {
  tweets: number
  accounts: number
  viral: number
}

interface Props {
  initial: TweetCardData[]
  isAuthed: boolean
  stats: Stats
}

const CATEGORIES = [
  ['all', 'All'],
  ['ai-coding', 'AI coding'],
  ['ai-agent', 'AI agents'],
  ['hardware', 'AI hardware'],
  ['infra', 'AI infra'],
  ['consumer', 'Consumer AI'],
  ['video', 'Video AI'],
  ['image', 'Image AI'],
  ['audio', 'Audio AI'],
  ['productivity', 'Productivity AI'],
  ['vertical', 'Vertical AI'],
  ['indie', 'Indie AI'],
  ['founder', 'Founders'],
] as const

const TYPES = [
  ['all', 'All'],
  ['founder', 'Founder posts'],
  ['official', 'Official posts'],
] as const

const TAGS = [
  ['all', 'All'],
  ['viral', 'Viral'],
  ['launch', 'Launch'],
  ['metric', 'Metric'],
  ['thread', 'Thread'],
  ['low-key-demo', 'Low-key demo'],
  ['engagement', 'Engagement'],
  ['meme', 'Meme'],
  ['behind-the-scenes', 'Behind-the-scenes'],
] as const

const SORTS = [
  ['likes', 'Sort · Likes'],
  ['views', 'Sort · Views'],
  ['bookmarks', 'Sort · Bookmarks'],
  ['recent', 'Sort · Recent'],
] as const

const KEYWORD_MAP: Record<string, string[]> = {
  'ai-coding':    ['ide','code','coding','codegen','codebase','dev tool','devtool','editor','autocomplete','pair programmer','programming','compiler','linter','debugger','syntax','repo','git','vibe coding','agent coding'],
  'ai-agent':     ['agent','agentic','autonomous','workflow','task automation','rpa','copilot','assistant','task agent','browser agent','operator','swarm','crew'],
  'infra':        ['gpu','inference','training','mlops','ml ops','pipeline','embedding','embeddings','vector','rag','retrieval','compute','fine-tune','finetune','fine tune','model serving','tensor','foundation model','llm api','sdk','quantization','distillation','inference engine'],
  'consumer':     ['consumer','b2c','social','mobile','creator','dating','entertainment','gaming','game','companion','therapy','meditation','dating app','character','roleplay','rpg'],
  'image':        ['image','photo','design','logo','avatar','art','midjourney','stable diffusion','sd','dalle','flux','imagegen','illustration','sticker','wallpaper','interior design','fashion design','ai art'],
  'video':        ['video','motion','animation','film','shorts','clip','reel','tiktok','youtube','vfx','runway','sora','veo','lipsync','avatar video','ai video'],
  'audio':        ['audio','voice','speech','music','tts','asr','podcast','voiceover','dubbing','clone voice','voice clone','lyric','song','singing','elevenlabs','suno','udio'],
  'productivity': ['notes','docs','meeting','calendar','email','slack','crm','task','todo','knowledge base','wiki','obsidian','notion','spreadsheet','excel','sheet','google docs'],
  'vertical':     ['legal','medical','health','finance','sales','hr','real estate','recruit','recruiting','accounting','tax','insurance','pharma','clinical','radiology','therapy','b2b saas','enterprise saas','vertical saas'],
  'indie':        ['solo','indie','bootstrap','side project','one-person','single founder','solopreneur','micro saas'],
  'hardware':     ['hardware','wearable','ring','band','watch','glasses','smart glasses','pin','pendant','necklace','device','chip','sensor','iot','smart home','robot','robotics','drone','headphone','earbud','camera','vr','ar','headset'],
}

function matchCategory(text: string): [string, number] | null {
  const norm = (text || '').toLowerCase()
  if (!norm.trim()) return null
  const scores: Record<string, number> = {}
  for (const [cat, words] of Object.entries(KEYWORD_MAP)) {
    let score = 0
    for (const w of words) {
      const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
      if (re.test(norm)) score++
    }
    if (score) scores[cat] = score
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return ranked.length ? [ranked[0]![0], ranked[0]![1]] : null
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export default function Lab({ initial, isAuthed, stats }: Props) {
  const [tweets, setTweets] = useState<TweetCardData[]>(initial)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initial.length > 0)
  const [pending, startTransition] = useTransition()
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeType, setActiveType] = useState('all')
  const [activeTag, setActiveTag] = useState('all')
  const [activeSort, setActiveSort] = useState('likes')
  const [startupText, setStartupText] = useState('')
  const [matchHint, setMatchHint] = useState('')

  // First-render flag: skip the very first refetch since we already have `initial`
  const [isFirstRender, setFirstRender] = useState(true)

  const buildQuery = useCallback((p: number) => {
    const q = new URLSearchParams()
    q.set('page', String(p))
    if (activeCategory !== 'all') q.set('category', activeCategory)
    if (activeType !== 'all')     q.set('type', activeType)
    if (activeTag !== 'all')      q.set('tag', activeTag)
    if (activeSort !== 'likes')   q.set('sort', activeSort)
    return q.toString()
  }, [activeCategory, activeType, activeTag, activeSort])

  // Refetch from page 1 whenever any filter changes
  useEffect(() => {
    if (isFirstRender) {
      setFirstRender(false)
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/viralx/tweets?${buildQuery(1)}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setTweets(data.tweets || [])
      setPage(1)
      setHasMore(!!data.hasMore)
    })
  }, [activeCategory, activeType, activeTag, activeSort, buildQuery, isFirstRender])

  const loadMore = () => {
    if (!hasMore || pending) return
    startTransition(async () => {
      const next = page + 1
      const res = await fetch(`/api/viralx/tweets?${buildQuery(next)}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setTweets(prev => [...prev, ...(data.tweets || [])])
      setPage(next)
      setHasMore(!!data.hasMore)
    })
  }

  const onStartupSubmit = () => {
    const text = startupText.trim()
    if (!text) {
      setMatchHint('')
      return
    }
    const m = matchCategory(text)
    if (!m) {
      setMatchHint('No category matched · try keywords like "AI IDE", "voice clone", "wearable"')
      return
    }
    const [cat, score] = m
    const label = CATEGORIES.find(c => c[0] === cat)?.[1] ?? cat
    setMatchHint(`→ matched ${label} (${score} hit${score > 1 ? 's' : ''})`)
    setActiveCategory(cat)
    // Smooth-scroll the lab into view
    setTimeout(() => {
      document.getElementById('xh-lab')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <header className="xh-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" />ViralX · Live tool</span>
          <h1 className="xh-h1">
            See how others go viral on X.<br />Ship to your <em>own X</em>.
          </h1>
          <p className="xh-finding">
            <strong>10,000+ viral tweet templates</strong> from 500+ AI founders and startup accounts — Cursor, Lovable, DeepSeek, Hedra, Perplexity, and the indie operators behind them. Pick a pattern that fits your startup, customize it, schedule it, and post it straight to your own X account.
          </p>

          <div className="xh-startup-row">
            <span className="eyebrow xh-label">My startup ·</span>
            <input
              className="xh-startup-input"
              type="text"
              placeholder="e.g. AI IDE for game devs · voice clone for podcasters · wearable for athletes"
              value={startupText}
              onChange={e => setStartupText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onStartupSubmit() } }}
              autoComplete="off"
            />
            <button className="xh-startup-go" onClick={onStartupSubmit}>Find my templates</button>
            {matchHint && <span className="xh-startup-hint">{matchHint}</span>}
          </div>

          <div className="xh-meta">
            <div className="xh-meta-item"><b>{fmt(stats.tweets)}+</b> viral templates</div>
            <div className="xh-meta-item"><b>{fmt(stats.accounts)}+</b> AI founders & startups</div>
            <div className="xh-meta-item"><b>{fmt(stats.viral)}+</b> proven hits (5K+ likes)</div>
            <div className="xh-meta-item">
              <Link href="/viralx/playbook" className="xh-playbook-link">
                Read the full playbook →
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── LAB ───────────────────────────────────────────────────────── */}
      <div id="xh-lab" className="xh-toolbar">
        <div className="shell">
          <FilterRow
            label="Category"
            options={CATEGORIES}
            active={activeCategory}
            onPick={setActiveCategory}
          />
          <FilterRow
            label="Account"
            options={TYPES}
            active={activeType}
            onPick={setActiveType}
          />
          <FilterRow
            label="Tag"
            options={TAGS}
            active={activeTag}
            onPick={setActiveTag}
          />
          <div className="xh-filter-row xh-view-row">
            <span className="eyebrow xh-label">View ·</span>
            <span className="xh-count">{tweets.length} showing{!isAuthed ? ' (sign in for 50/page)' : ''}</span>
            <div className="xh-right">
              <select
                className="xh-sort"
                value={activeSort}
                onChange={e => setActiveSort(e.target.value)}
              >
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <main className="shell xh-main">
        <div className="xh-grid">
          {tweets.map(t => (
            <TweetCard key={t.id} tweet={t} isAuthed={isAuthed} />
          ))}
        </div>
        {tweets.length === 0 && !pending && (
          <div className="xh-empty">No tweets match these filters. Try removing one.</div>
        )}
        {hasMore && (
          <div className="xh-loadmore">
            <button className="xh-loadmore-btn" disabled={pending} onClick={loadMore}>
              {pending ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
        {!isAuthed && tweets.length > 0 && (
          <div className="xh-signin-cta">
            <p>Sign in (free, Google, no spam) to unlock <b>50 templates per page</b>, filtering across the full library, and one-click scheduling to your own X account.</p>
            <Link href="/login" className="xh-signin-btn">Sign in to continue →</Link>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: labStyles }} />
    </>
  )
}

function FilterRow({
  label,
  options,
  active,
  onPick,
}: {
  label: string
  options: readonly (readonly [string, string])[]
  active: string
  onPick: (v: string) => void
}) {
  return (
    <div className="xh-filter-row">
      <span className="eyebrow xh-label">{label} ·</span>
      <div className="xh-chips">
        {options.map(([v, l]) => (
          <button
            key={v}
            className={`xh-chip${active === v ? ' xh-chip-active' : ''}`}
            onClick={() => onPick(v)}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

const labStyles = `
.xh-hero {
  padding: 80px 0 56px;
  border-bottom: 1px solid var(--rule);
  position: relative; overflow: hidden;
}
.xh-h1 {
  font-family: var(--serif);
  font-size: clamp(48px, 6.4vw, 88px);
  line-height: 0.98;
  letter-spacing: -0.032em;
  font-weight: 400;
  margin: 28px 0 26px;
  max-width: 980px;
}
.xh-h1 em { font-style: italic; color: var(--accent); }
.xh-finding {
  font-size: 17px;
  line-height: 1.55;
  color: var(--ink-dim);
  max-width: 760px;
  margin-bottom: 36px;
}
.xh-finding strong { color: var(--ink); font-weight: 600; }
.xh-startup-row {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.xh-label { flex-shrink: 0; min-width: 76px; }
.xh-startup-input {
  flex: 1; min-width: 280px;
  font-family: var(--sans);
  font-size: 14px;
  padding: 11px 18px;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  background: var(--bg-elev);
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s;
}
.xh-startup-input:focus { border-color: var(--accent); }
.xh-startup-input::placeholder { color: var(--ink-faint); }
.xh-startup-go {
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 500;
  padding: 11px 22px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  border: 1px solid var(--accent);
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.xh-startup-go:hover { opacity: 0.92; }
.xh-startup-hint {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--accent);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-basis: 100%;
}
.xh-meta {
  display: flex; gap: 28px; flex-wrap: wrap; align-items: center;
  padding-top: 24px;
  border-top: 1px solid var(--rule);
}
.xh-meta-item {
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: 0.05em;
  color: var(--ink-faint);
  text-transform: uppercase;
}
.xh-meta-item b { color: var(--ink); font-weight: 500; margin-right: 6px; }
.xh-playbook-link { color: var(--accent); font-weight: 500; }
.xh-playbook-link:hover { text-decoration: underline; }

.xh-toolbar {
  position: sticky; top: 64px; z-index: 40;
  backdrop-filter: blur(20px);
  background: rgba(250,250,247,0.92);
  border-bottom: 1px solid var(--rule);
  padding: 12px 0 14px;
}
.xh-filter-row {
  display: flex; align-items: center; gap: 12px;
  padding: 4px 0;
  border-bottom: 1px dashed var(--rule);
}
.xh-filter-row:last-child { border-bottom: none; padding-top: 8px; }
.xh-chips {
  display: flex; gap: 6px; flex-wrap: wrap; flex: 1;
}
.xh-chip {
  font-family: var(--mono);
  font-size: 11px;
  padding: 5px 11px;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  color: var(--ink-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--bg-elev);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.xh-chip:hover { color: var(--ink); border-color: var(--ink); }
.xh-chip-active {
  color: var(--accent);
  border-color: var(--accent-border);
  background: var(--accent-soft);
}
.xh-view-row { padding-top: 10px; }
.xh-count {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.xh-right { margin-left: auto; }
.xh-sort {
  font-family: var(--mono);
  font-size: 11px;
  padding: 5px 32px 5px 12px;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  color: var(--ink-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--bg-elev);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.xh-main { padding: 32px 0 96px; }
.xh-grid { columns: 1; column-gap: 20px; }
@media (min-width: 720px)  { .xh-grid { columns: 2; } }
@media (min-width: 1080px) { .xh-grid { columns: 3; } }

.xh-empty {
  text-align: center; padding: 80px 0;
  font-family: var(--mono); font-size: 12px;
  letter-spacing: 0.06em; color: var(--ink-faint);
  text-transform: uppercase;
}
.xh-loadmore { text-align: center; padding: 32px 0 16px; }
.xh-loadmore-btn {
  font-family: var(--sans); font-size: 14px; font-weight: 500;
  padding: 12px 28px; border-radius: 999px;
  background: var(--bg-elev); color: var(--ink);
  border: 1px solid var(--rule-strong);
  cursor: pointer; transition: all 0.15s;
}
.xh-loadmore-btn:hover { border-color: var(--ink); }
.xh-loadmore-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.xh-signin-cta {
  margin: 48px auto 0;
  max-width: 560px;
  text-align: center;
  padding: 40px 32px;
  border: 1px solid var(--rule-strong);
  border-radius: 16px;
  background: var(--bg-elev);
}
.xh-signin-cta p { color: var(--ink-dim); font-size: 15px; line-height: 1.5; margin-bottom: 18px; }
.xh-signin-btn {
  display: inline-block;
  font-family: var(--sans); font-size: 14px; font-weight: 500;
  padding: 11px 24px; border-radius: 999px;
  background: var(--ink); color: var(--bg);
  transition: opacity 0.15s;
}
.xh-signin-btn:hover { opacity: 0.92; }

@media (max-width: 720px) {
  .xh-hero { padding: 56px 0 36px; }
  .xh-meta { gap: 16px; }
  .xh-toolbar { top: 0; }
}
`
