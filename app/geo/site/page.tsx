import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { SiteForm } from './SiteForm'

const PAGE_URL = 'https://growthhunt.ai/geo/site'
const TITLE = 'Site-wide GEO audit — Heatmap of every page'
const DESCRIPTION =
  'Audit every page on your domain in one shot. Reads sitemap.xml, scores up to 30 URLs across 8 GEO dimensions, and shows a heatmap of weakest pages first.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { type: 'website', url: PAGE_URL, title: TITLE, description: DESCRIPTION },
}

export default function SitePage() {
  return (
    <div>
      <TopNav variant="page" />
      <section className="hero">
        <div className="shell">
          <div className="grid-2">
            <div>
              <div className="eyebrow"><span className="dot" />Site audit · beta</div>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 16px' }}>
                Heatmap your <em>whole site</em>.
              </h1>
            </div>
            <div>
              <p style={{ fontSize: 17, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px' }}>
                Drop a domain. We pull <strong>/sitemap.xml</strong>, audit up to 30 most recently
                updated pages on the 8 GEO dimensions, and sort them weakest-first so you know
                exactly where to start.
              </p>
              <SiteForm />
              <div className="meta" style={{ marginTop: 24 }}>
                <span style={{ color: 'var(--ink-faint)' }}>
                  Cached audits stay free · <Link href="/geo" style={{ color: 'var(--ink-dim)' }}>single-URL audit →</Link> · <Link href="/geo/compete" style={{ color: 'var(--ink-dim)' }}>side-by-side →</Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
