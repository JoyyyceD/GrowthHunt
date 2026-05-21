import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TopNav } from '@/lib/site/TopNav'
import { getShare } from '@/lib/geo/shares'
import { AuditReport } from '../../AuditReport'

// Share pages are user-generated snapshots — keep them out of the index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function GeoSharePage({
  params,
}: {
  params: Promise<{ hash: string }>
}) {
  const { hash } = await params
  const share = await getShare(hash)
  if (!share) notFound()

  let host = share.url
  try {
    host = new URL(share.url).hostname.replace(/^www\./, '')
  } catch {
    /* keep raw url */
  }

  return (
    <div>
      <TopNav variant="page" />
      <main>
        <section style={{ padding: '48px 0 64px' }}>
          <div className="shell" style={{ maxWidth: 900 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              <span className="dot" />Shared GEO report
            </div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 56px)', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1, margin: '0 0 28px' }}>
              GEO audit for <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{host}</em>
            </h1>

            <AuditReport result={share.result} />

            <div style={{ marginTop: 36, textAlign: 'center', padding: '32px 24px', border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-card)' }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, margin: '0 0 10px' }}>
                Audit your own product
              </h2>
              <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 18px' }}>
                Free GEO audit — see how ChatGPT, Perplexity and Claude read your pages.
              </p>
              <Link href="/geo" className="btn-line" style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>
                Run a free audit <span className="arrow">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--rule)', padding: '24px 0', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/geo" style={{ fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'none' }}>← GrowthHunt GEO</Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}
