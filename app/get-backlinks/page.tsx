import Link from 'next/link'
import { fetchDirectories } from '@/lib/directories'
import { TopNav } from '@/lib/site/TopNav'
import InteractiveSection from './InteractiveSection'

export const dynamic = 'force-dynamic'

export default async function GetBacklinksPage() {
  const directories = await fetchDirectories()
  const totalCount = directories.length

  return (
    <div>
      <TopNav variant="page" />

      {/* Hero */}
      <section style={{ padding: '64px 0 48px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell">
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <span className="tag live">● Live now</span>
            <span className="tag">Distribution</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'end' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(44px, 6vw, 80px)', fontWeight: 400, lineHeight: 0.96, letterSpacing: '-0.033em', margin: '0 0 20px' }}>
                Submit to {totalCount}+ hand-picked directories.<br />
                <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>While you sleep.</em>
              </h1>
              <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 520, lineHeight: 1.6, margin: 0 }}>
                Manual directory submissions take 30–40 hours per launch. We handle every form, every captcha, every follow-up — and report what got accepted. No inflated numbers. Every directory is shown.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 44, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1 }}>DR 15+</span>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>guaranteed for new sites</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 44, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1 }}>30 days</span>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>gradual human-like posting</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InteractiveSection directories={directories} />

      {/* Guarantee strip */}
      <section style={{ padding: '40px 0', borderTop: '1px solid var(--rule)' }}>
        <div className="shell">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
            {[
              ['DR 15+ guaranteed', 'New sites. Or we keep working until it happens — or refund.'],
              [`${totalCount} directories, all visible`, 'No blurred cards, no hidden lists. What you see is what gets submitted.'],
              ['30-day drip', 'Human-paced posting over a full month. No spam signals.'],
              ['Full ownership', 'You own every listing. Edit or remove at any time.'],
            ].map(([title, body]) => (
              <div key={title}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.55 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--rule)', padding: '24px 0', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'none' }}>← All tools</Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}
