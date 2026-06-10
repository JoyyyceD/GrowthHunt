/**
 * /scout/report/[slug] — public, read-only playbook report (V2-T1).
 * No auth. Only renders when the owner enabled sharing; shared pages are
 * indexable by design (decision D5). Every visit is the funnel's top.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getPublicReport } from '@/lib/scout/reports'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const report = await getPublicReport(slug)
  if (!report) return { title: 'Report not found · Scout', robots: { index: false } }
  const title = `${report.workspace.name} growth playbook — built by Scout`
  const description =
    report.workspace.one_liner ||
    `Brand strategy, audience personas, competitive analysis and a first week of posts for ${report.workspace.name} — researched and written by Scout, the AI growth teammate.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'article', siteName: 'GrowthHunt' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PublicReportPage({ params }: Params) {
  const { slug } = await params
  const report = await getPublicReport(slug)

  if (!report) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>🐾</div>
          <h1 className="serif" style={{ fontSize: 26, margin: '0 0 8px' }}>This playbook isn&apos;t public.</h1>
          <p style={{ fontSize: 14.5, color: 'var(--ink-dim)' }}>
            The owner hasn&apos;t shared it — but Scout can build one for you.
          </p>
          <Link href="/scout" style={ctaStyle}>Get your free playbook →</Link>
        </div>
      </div>
    )
  }

  const accent = report.workspace.brand_color || 'var(--accent)'
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--rule)', background: 'var(--bg-elev)' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
            🐾 Built by <b>Scout</b> · GrowthHunt&apos;s AI growth teammate
          </span>
          <Link href="/scout" style={{ ...ctaStyle, margin: 0, padding: '8px 18px', fontSize: 13 }}>Get yours free →</Link>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ borderLeft: `4px solid ${accent}`, paddingLeft: 20, marginBottom: 12 }}>
          <h1 className="serif" style={{ fontSize: 40, margin: 0, letterSpacing: '-0.02em' }}>
            {report.workspace.name} growth playbook
          </h1>
          {report.workspace.one_liner && (
            <p style={{ fontSize: 16.5, color: 'var(--ink-dim)', margin: '10px 0 0', lineHeight: 1.6 }}>{report.workspace.one_liner}</p>
          )}
        </div>
        <p className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '0 0 36px' }}>
          {report.docs.length} documents · researched and written by Scout in ~3 minutes · AI-generated analysis, sources named inline
        </p>

        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
          {report.docs.map(d => (
            <a key={d.slug} href={`#${d.slug}`} className="mono" style={{ fontSize: 12, padding: '5px 12px', borderRadius: 999, border: '1px solid var(--rule-strong)', color: 'var(--ink-dim)', textDecoration: 'none' }}>
              {d.slug}
            </a>
          ))}
        </nav>

        {report.docs.map(d => (
          <article key={d.slug} id={d.slug} style={{ marginBottom: 48, padding: '28px 32px', background: 'var(--bg-elev)', border: '1px solid var(--rule)', borderRadius: 14 }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 14 }}>📝 {d.slug}.md</div>
            <div className="scout-md" style={{ fontSize: 15, lineHeight: 1.7 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.content_md}</ReactMarkdown>
            </div>
          </article>
        ))}

        <div style={{ textAlign: 'center', padding: '40px 24px', border: '1.5px solid var(--accent-border)', borderRadius: 16, background: 'var(--bg-elev)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }} aria-hidden>🐾</div>
          <h2 className="serif" style={{ fontSize: 26, margin: '0 0 8px' }}>Want one of these for your product?</h2>
          <p style={{ fontSize: 14.5, color: 'var(--ink-dim)', margin: '0 0 20px' }}>
            Drop your URL — Scout reads your site, scopes your market, and writes the whole playbook. Free, about three minutes.
          </p>
          <Link href="/scout" style={ctaStyle}>Hire Scout — free →</Link>
        </div>
      </main>
    </div>
  )
}

const ctaStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16,
  background: 'var(--accent)', color: 'var(--accent-ink)',
  padding: '12px 26px', borderRadius: 999, fontSize: 14.5, fontWeight: 600, textDecoration: 'none',
}
