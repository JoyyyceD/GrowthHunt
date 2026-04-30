import Link from 'next/link'
import { readFileSync } from 'fs'
import { join } from 'path'
import { TopNav } from '@/lib/site/TopNav'
import HNGeneratorClient from './HNGeneratorClient'

export const metadata = {
  title: 'HN Post Generator — GrowthHunt',
  description:
    'Write Hacker News posts that hit the front page. Choose from 25+ proven patterns, fill in your details, and generate with AI.',
}

export default function HNGeneratorPage() {
  let templates: unknown[] = []
  try {
    const raw = readFileSync(join(process.cwd(), 'data/hn-templates.json'), 'utf-8')
    templates = JSON.parse(raw)
  } catch {
    // data file missing — show empty state gracefully
    templates = []
  }

  return (
    <div>
      <TopNav variant="page" />

      {/* Hero */}
      <section style={{ padding: '64px 0 48px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell">
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <span className="tag live">● Live now</span>
            <span className="tag">Community</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'end' }}>
            <div>
              <h1
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 'clamp(44px, 6vw, 80px)',
                  fontWeight: 400,
                  lineHeight: 0.96,
                  letterSpacing: '-0.033em',
                  margin: '0 0 20px',
                }}
              >
                Write HN posts that{' '}
                <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>hit the front page.</em>
              </h1>
              <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 520, lineHeight: 1.6, margin: 0 }}>
                25+ patterns reverse-engineered from high-scoring Hacker News posts. Pick a pattern,
                fill in your product details, and let AI write the rest.
              </p>
            </div>

            {/* Stats panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 44,
                    fontWeight: 400,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {templates.length}+
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>proven HN patterns</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 44,
                    fontWeight: 400,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  400+
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>avg upvotes per pattern</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <HNGeneratorClient templates={templates as any} />

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--rule)', padding: '24px 0', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'none' }}>
            ← All tools
          </Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}
