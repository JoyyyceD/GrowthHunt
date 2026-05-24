import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { CompeteForm } from './CompeteForm'

const PAGE_URL = 'https://growthhunt.ai/geo/compete'
const TITLE = 'GEO Compete — Side-by-side AI-citation audit'
const DESCRIPTION =
  'Compare your page against up to 3 competitors across 8 GEO dimensions. See exactly where rivals get cited by AI engines and you don\'t. Free, ~25 seconds.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function CompetePage() {
  return (
    <div>
      <TopNav variant="page" />
      <section className="hero">
        <div className="shell">
          <div className="grid-2">
            <div>
              <div className="eyebrow"><span className="dot" />Compete · beta</div>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 16px' }}>
                See where <em>competitors</em><br />outrank you in AI.
              </h1>
            </div>
            <div>
              <p style={{ fontSize: 17, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px' }}>
                Drop your URL and up to <strong>3 competitor URLs</strong>. We audit all of them on the
                same 8 GEO dimensions and surface the dimensions where rivals beat you — the exact
                spots an AI assistant is choosing them over you.
              </p>
              <CompeteForm />
              <div className="meta" style={{ marginTop: 24 }}>
                <span style={{ color: 'var(--ink-faint)' }}>
                  Cached audits stay free · <Link href="/geo" style={{ color: 'var(--ink-dim)' }}>back to single-URL audit →</Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
