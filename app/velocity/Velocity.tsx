'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type {
  RepoCard,
  BuilderCard,
  ViralCard,
  BuilderRankMode,
} from '@/lib/velocity/types'

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number): string => {
  if (!n || n < 0) return n ? String(n) : '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '') + 'K'
  return String(n)
}

const fmtDate = (s: string | null): string => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const prettyCategory = (c: string | null): string => {
  if (!c) return ''
  return c
    .split('-')
    .map(w => (w.toLowerCase() === 'ai' ? 'AI' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

const LANG_COLORS: Record<string, string> = {
  Python: '#3572A5', TypeScript: '#3178c6', JavaScript: '#f1e05a', Rust: '#dea584',
  Go: '#00ADD8', 'Jupyter Notebook': '#DA5B0B', C: '#555555', 'C++': '#f34b7d',
  Java: '#b07219', Swift: '#F05138', Kotlin: '#A97BFF', Ruby: '#701516',
  Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c', Vue: '#41b883', Zig: '#ec915c',
}
const langColor = (l: string | null): string => (l && LANG_COLORS[l]) || 'var(--ink-faint)'

type Tab = 'repos' | 'builders' | 'viral'

interface Props {
  repos: RepoCard[]
  builders: BuilderCard[]
  viral: ViralCard[]
  builderRankMode: BuilderRankMode
  updatedAt: string | null
}

export function Velocity({ repos, builders, viral, builderRankMode, updatedAt }: Props) {
  const [tab, setTab] = useState<Tab>('repos')
  const [repoFilter, setRepoFilter] = useState<'all' | 'ai'>('all')

  const shownRepos = useMemo(
    () => (repoFilter === 'ai' ? repos.filter(r => r.isAI) : repos),
    [repos, repoFilter],
  )

  const shareUrl = 'https://growthhunt.ai/velocity'
  const shareText =
    'The fastest-moving things in AI this week — fastest-growing GitHub repos, breakout founders, and the most viral products. Updated weekly:'
  const shareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}&url=${encodeURIComponent(shareUrl)}`

  return (
    <div className="vel-wrap">
      {/* ── Hero ── */}
      <section className="vel-hero">
        <div className="shell">
          <div className="eyebrow">
            <span className="dot" />
            Velocity · Updated weekly{updatedAt ? ` · Last refresh ${fmtDate(updatedAt)}` : ''}
          </div>
          <h1>
            The <em>fastest-moving</em> things in AI.
          </h1>
          <p className="vel-lede">
            A weekly leaderboard of the GitHub repos gaining stars fastest, the AI founders
            growing fastest on X, and the products spreading furthest. One page, refreshed every
            Monday.
          </p>
          <div className="vel-statline">
            <div className="vel-stat">
              <span className="n serif">{repos.length}</span>
              <span className="l">Repos tracked</span>
            </div>
            <div className="vel-stat">
              <span className="n serif">{builders.length}</span>
              <span className="l">Builders ranked</span>
            </div>
            <div className="vel-stat">
              <span className="n serif">{viral.length}</span>
              <span className="l">Viral products</span>
            </div>
            <a className="vel-share" href={shareHref} target="_blank" rel="noopener">
              Share on X →
            </a>
          </div>
        </div>
      </section>

      {/* ── Tabs ── */}
      <div className="vel-tabbar">
        <div className="shell vel-tabs">
          <TabButton id="repos" active={tab} set={setTab} label="Repos" count={repos.length} />
          <TabButton id="builders" active={tab} set={setTab} label="Builders" count={builders.length} />
          <TabButton id="viral" active={tab} set={setTab} label="Viral" count={viral.length} />
        </div>
      </div>

      {/* ── Panels ── */}
      <section className="vel-panel">
        <div className="shell">
          {tab === 'repos' && (
            <>
              <div className="vel-note">
                <span>
                  Ranked by stars earned <strong>per day since launch</strong> — every repo here
                  was created in the last 90 days, so this is a clean velocity signal.
                </span>
                <div className="vel-seg">
                  <button
                    className={repoFilter === 'all' ? 'on' : ''}
                    onClick={() => setRepoFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={repoFilter === 'ai' ? 'on' : ''}
                    onClick={() => setRepoFilter('ai')}
                  >
                    AI only
                  </button>
                </div>
              </div>
              {shownRepos.length === 0 ? (
                <Empty kind="repos" />
              ) : (
                <div className="vel-list">
                  {shownRepos.map((r, i) => (
                    <RepoRow key={r.fullName} repo={r} display={i + 1} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'builders' && (
            <>
              <div className="vel-note">
                <span>
                  {builderRankMode === 'followers' ? (
                    <>Ranked by <strong>followers gained since last week</strong>.</>
                  ) : (
                    <>
                      Ranked by <strong>30-day momentum</strong> — likes + bookmarks earned on
                      posts in the last 30 days. Week-over-week follower growth unlocks once the
                      tracker has two weekly snapshots.
                    </>
                  )}
                </span>
              </div>
              {builders.length === 0 ? (
                <Empty kind="builders" />
              ) : (
                <div className="vel-list">
                  {builders.map(b => (
                    <BuilderRow key={b.handle} builder={b} mode={builderRankMode} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'viral' && (
            <>
              <div className="vel-note">
                <span>
                  AI products ranked by <strong>total engagement</strong> on their launch &amp;
                  viral posts over the last 90 days.
                </span>
              </div>
              {viral.length === 0 ? (
                <Empty kind="viral" />
              ) : (
                <div className="vel-list">
                  {viral.map(v => (
                    <ViralRow key={v.company} viral={v} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Cross-sell ── */}
      <section className="vel-cta">
        <div className="shell">
          <h2>
            See a pattern? <em>Go make one.</em>
          </h2>
          <p>
            Velocity shows you what&apos;s working. GrowthHunt&apos;s tools help you do it — viral
            tweet templates, an X growth engine, and a weekly AI launch board.
          </p>
          <div className="vel-cta-row">
            <Link href="/viralx" className="vel-cta-btn primary">
              Open ViralX →
            </Link>
            <Link href="/#live" className="vel-cta-btn">
              All live tools →
            </Link>
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </div>
  )
}

// ── Tab button ───────────────────────────────────────────────────────────────
function TabButton({
  id,
  active,
  set,
  label,
  count,
}: {
  id: Tab
  active: Tab
  set: (t: Tab) => void
  label: string
  count: number
}) {
  return (
    <button
      className={`vel-tab${active === id ? ' active' : ''}`}
      onClick={() => set(id)}
      type="button"
    >
      {label}
      <span className="badge">{count}</span>
    </button>
  )
}

// ── Repo row ─────────────────────────────────────────────────────────────────
function RepoRow({ repo: r, display }: { repo: RepoCard; display: number }) {
  return (
    <a className="vel-row" href={r.url} target="_blank" rel="noopener">
      <div className={`vel-rank${display <= 3 ? ' top' : ''}`}>{display}</div>
      <div className="vel-main">
        {r.ownerAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="vel-av sq" src={r.ownerAvatar} alt="" loading="lazy" />
        ) : (
          <div className="vel-av sq vel-av-fb">{r.owner.charAt(0).toUpperCase()}</div>
        )}
        <div className="vel-body">
          <div className="vel-title">
            <span className="vel-dim">{r.owner}/</span>
            {r.name}
            {r.isNew && <span className="vel-pill new">NEW</span>}
            {r.isAI && <span className="vel-pill ai">AI</span>}
          </div>
          {r.description && <div className="vel-sub">{r.description}</div>}
          <div className="vel-chips">
            {r.language && (
              <span className="vel-chip">
                <span className="vel-langdot" style={{ background: langColor(r.language) }} />
                {r.language}
              </span>
            )}
            {r.topics.map(t => (
              <span className="vel-chip" key={t}>
                {t}
              </span>
            ))}
            <span className="vel-chip ghost">{r.ageDays}d old</span>
          </div>
        </div>
      </div>
      <div className="vel-metric">
        <div className="big accent">{fmt(r.velocityPerDay)}</div>
        <div className="unit">stars / day</div>
        <div className="sub2">
          {fmt(r.stars)} total
          {r.weeklyDelta != null && r.weeklyDelta > 0 && (
            <span className="up"> · +{fmt(r.weeklyDelta)} this wk</span>
          )}
        </div>
      </div>
    </a>
  )
}

// ── Builder row ──────────────────────────────────────────────────────────────
function BuilderRow({ builder: b, mode }: { builder: BuilderCard; mode: BuilderRankMode }) {
  return (
    <a
      className="vel-row"
      href={`https://x.com/${b.handle}`}
      target="_blank"
      rel="noopener"
    >
      <div className={`vel-rank${b.rank <= 3 ? ' top' : ''}`}>{b.rank}</div>
      <div className="vel-main">
        {b.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="vel-av" src={b.avatar} alt="" loading="lazy" />
        ) : (
          <div className="vel-av vel-av-fb">{b.name.charAt(0).toUpperCase()}</div>
        )}
        <div className="vel-body">
          <div className="vel-title">
            {b.name}
            {b.verified && <span className="vel-verified">✓</span>}
          </div>
          <div className="vel-meta">
            @{b.handle}
            {b.displayLabel ? ` · ${b.displayLabel}` : b.company ? ` · ${b.company}` : ''}
          </div>
          {b.topTweetText && (
            <div className="vel-quote">“{b.topTweetText.replace(/\s+/g, ' ').trim()}”</div>
          )}
        </div>
      </div>
      <div className="vel-metric">
        {mode === 'followers' && b.followerDelta != null ? (
          <>
            <div className="big up-text">+{fmt(b.followerDelta)}</div>
            <div className="unit">followers / week</div>
            <div className="sub2">{fmt(b.followers)} total</div>
          </>
        ) : (
          <>
            <div className="big accent">{fmt(b.momentum)}</div>
            <div className="unit">30-day momentum</div>
            <div className="sub2">
              {fmt(b.followers)} followers · {b.tweets30d} posts
            </div>
          </>
        )}
      </div>
    </a>
  )
}

// ── Viral row ────────────────────────────────────────────────────────────────
function ViralRow({ viral: v }: { viral: ViralCard }) {
  const href = v.topTweetUrl || (v.topHandle ? `https://x.com/${v.topHandle}` : '#')
  return (
    <a className="vel-row" href={href} target="_blank" rel="noopener">
      <div className={`vel-rank${v.rank <= 3 ? ' top' : ''}`}>{v.rank}</div>
      <div className="vel-main">
        {v.topAuthorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="vel-av sq" src={v.topAuthorAvatar} alt="" loading="lazy" />
        ) : (
          <div className="vel-av sq vel-av-fb">{v.company.charAt(0).toUpperCase()}</div>
        )}
        <div className="vel-body">
          <div className="vel-title">{v.company}</div>
          <div className="vel-meta">
            {v.category ? `${prettyCategory(v.category)} · ` : ''}
            {v.viralCount > 0 ? `${v.viralCount} viral` : `${v.launchCount} launch`} post
            {(v.viralCount > 0 ? v.viralCount : v.launchCount) === 1 ? '' : 's'}
          </div>
          {v.topTweetText && (
            <div className="vel-quote">
              “{v.topTweetText.replace(/\s+/g, ' ').trim()}”
              {v.topHandle && <span className="vel-quote-by"> — @{v.topHandle}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="vel-metric">
        <div className="big accent">{fmt(v.engagement)}</div>
        <div className="unit">total engagement</div>
        <div className="sub2">{fmt(v.views)} views</div>
      </div>
    </a>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
function Empty({ kind }: { kind: Tab }) {
  const msg =
    kind === 'repos'
      ? 'The repo leaderboard populates on the first weekly refresh — check back shortly.'
      : kind === 'builders'
        ? 'The builder leaderboard is warming up — check back shortly.'
        : 'No viral products in the current window yet — check back shortly.'
  return <div className="vel-empty">{msg}</div>
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = `
.vel-wrap { background: var(--bg); }

.vel-hero { padding: 60px 0 38px; border-bottom: 1px solid var(--rule); }
.vel-hero h1 {
  font-family: var(--serif);
  font-size: clamp(46px, 6.6vw, 88px);
  line-height: 0.98;
  letter-spacing: -0.035em;
  font-weight: 400;
  margin: 18px 0 0;
  max-width: 880px;
}
.vel-hero h1 em { font-style: italic; color: var(--accent); }
.vel-lede {
  font-size: 17px;
  line-height: 1.58;
  color: var(--ink-dim);
  max-width: 580px;
  margin: 22px 0 0;
}
.vel-statline {
  display: flex;
  align-items: center;
  gap: 36px;
  flex-wrap: wrap;
  margin-top: 32px;
}
.vel-stat { display: flex; flex-direction: column; gap: 2px; }
.vel-stat .n { font-size: 30px; line-height: 1; color: var(--ink); }
.vel-stat .l {
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-faint);
}
.vel-share {
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  padding: 11px 20px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--bg);
  white-space: nowrap;
  transition: background 0.15s;
}
.vel-share:hover { background: var(--accent); }

/* tabs */
.vel-tabbar {
  position: sticky;
  top: 64px;
  z-index: 30;
  background: rgba(250,250,247,0.86);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--rule);
}
.vel-tabs { display: flex; gap: 30px; }
.vel-tab {
  padding: 16px 0;
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  font-family: var(--sans);
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink-faint);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: color 0.15s;
  margin-bottom: -1px;
}
.vel-tab:hover { color: var(--ink-dim); }
.vel-tab.active { color: var(--ink); border-bottom-color: var(--accent); }
.vel-tab .badge {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-faint);
  background: var(--bg-card);
  padding: 2px 7px;
  border-radius: 999px;
}
.vel-tab.active .badge { color: var(--accent); background: var(--accent-soft); }

/* panel */
.vel-panel { padding: 28px 0 72px; min-height: 60vh; }
.vel-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  font-size: 13px;
  color: var(--ink-dim);
  line-height: 1.5;
  padding: 14px 0 22px;
}
.vel-note strong { color: var(--ink); font-weight: 600; }
.vel-seg {
  display: flex;
  gap: 2px;
  background: var(--bg-card);
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 3px;
  flex-shrink: 0;
}
.vel-seg button {
  border: 0;
  background: none;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
}
.vel-seg button.on { background: var(--ink); color: var(--bg); }

/* rows */
.vel-list { display: flex; flex-direction: column; }
.vel-row {
  display: grid;
  grid-template-columns: 54px 1fr auto;
  gap: 22px;
  align-items: center;
  padding: 22px 16px 22px 0;
  border-bottom: 1px solid var(--rule);
  text-decoration: none;
  color: inherit;
  transition: background 0.13s;
}
.vel-row:first-child { border-top: 1px solid var(--rule); }
.vel-row:hover { background: var(--bg-elev); }

.vel-rank {
  font-family: var(--serif);
  font-style: italic;
  font-size: 34px;
  line-height: 1;
  color: var(--ink-faint);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.vel-rank.top { color: var(--accent); }

.vel-main { display: flex; gap: 15px; align-items: flex-start; min-width: 0; }
.vel-av {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg-card);
  border: 1px solid var(--rule);
  flex-shrink: 0;
}
.vel-av.sq { border-radius: 10px; }
.vel-av-fb {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--serif);
  font-size: 20px;
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}
.vel-body { min-width: 0; flex: 1; }
.vel-title {
  font-family: var(--serif);
  font-size: 21px;
  letter-spacing: -0.012em;
  line-height: 1.2;
  color: var(--ink);
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 8px;
}
.vel-title .vel-dim { color: var(--ink-faint); }
.vel-verified { color: var(--accent); font-size: 13px; }
.vel-pill {
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  padding: 2px 6px;
  border-radius: 4px;
  position: relative;
  top: -2px;
}
.vel-pill.new { background: var(--accent); color: var(--accent-ink); }
.vel-pill.ai { background: var(--accent-soft); color: var(--accent); }
.vel-sub {
  font-size: 13.5px;
  color: var(--ink-dim);
  line-height: 1.5;
  margin-top: 5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.vel-meta {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-faint);
  margin-top: 6px;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vel-quote {
  font-family: var(--serif);
  font-size: 14.5px;
  font-style: italic;
  color: var(--ink-dim);
  line-height: 1.45;
  margin-top: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.vel-quote-by { font-style: normal; font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }
.vel-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.vel-chip {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--ink-dim);
  background: var(--bg-elev);
  border: 1px solid var(--rule);
  padding: 3px 9px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.vel-chip.ghost { color: var(--ink-faint); background: transparent; }
.vel-langdot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

.vel-metric { text-align: right; min-width: 132px; }
.vel-metric .big {
  font-family: var(--serif);
  font-size: 33px;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.vel-metric .big.accent { color: var(--accent); }
.vel-metric .big.up-text { color: #1f7a3d; }
.vel-metric .unit {
  font-family: var(--mono);
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-faint);
  margin-top: 5px;
}
.vel-metric .sub2 {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-dim);
  margin-top: 7px;
}
.vel-metric .sub2 .up { color: #1f7a3d; }

.vel-empty {
  text-align: center;
  padding: 80px 24px;
  color: var(--ink-faint);
  font-family: var(--serif);
  font-style: italic;
  font-size: 19px;
}

/* cross-sell */
.vel-cta {
  padding: 88px 0 100px;
  text-align: center;
  background: var(--bg-card);
  border-top: 1px solid var(--rule);
}
.vel-cta h2 {
  font-family: var(--serif);
  font-size: clamp(38px, 5vw, 60px);
  line-height: 1.02;
  letter-spacing: -0.03em;
  font-weight: 400;
  margin: 0 0 16px;
}
.vel-cta h2 em { font-style: italic; color: var(--accent); }
.vel-cta p {
  color: var(--ink-dim);
  max-width: 520px;
  margin: 0 auto 32px;
  font-size: 15.5px;
  line-height: 1.6;
}
.vel-cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.vel-cta-btn {
  display: inline-flex;
  align-items: center;
  padding: 13px 24px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid var(--rule-strong);
  color: var(--ink);
  background: var(--bg-elev);
  transition: border-color 0.15s;
}
.vel-cta-btn:hover { border-color: var(--ink); }
.vel-cta-btn.primary {
  background: var(--accent);
  color: var(--accent-ink);
  border-color: var(--accent);
}
.vel-cta-btn.primary:hover { background: var(--ink); border-color: var(--ink); }

@media (max-width: 760px) {
  .vel-hero { padding: 40px 0 30px; }
  .vel-statline { gap: 24px; }
  .vel-share { margin-left: 0; }
  .vel-tabbar { top: 56px; }
  .vel-tabs { gap: 22px; }
  .vel-note { flex-direction: column; align-items: flex-start; gap: 14px; }
  .vel-row {
    grid-template-columns: 38px 1fr;
    gap: 14px;
    padding: 20px 0;
  }
  .vel-rank { font-size: 24px; }
  .vel-metric {
    grid-column: 1 / -1;
    text-align: left;
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding-left: 52px;
  }
  .vel-metric .unit, .vel-metric .sub2 { margin-top: 0; }
  .vel-av { width: 38px; height: 38px; }
  .vel-title { font-size: 19px; }
}
`
