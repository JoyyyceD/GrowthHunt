import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { GeoAuditForm } from './GeoAuditForm'

const PAGE_URL = 'https://growthhunt.ai/geo'
const TITLE = 'GEO Audit — Get Your Product Cited by AI Search'
const DESCRIPTION =
  'Free Generative Engine Optimization audit. Drop a URL and get a 0–100 score across 8 dimensions, a prioritized fix list, and a Claude Code skill that applies the fixes — so ChatGPT, Perplexity, Gemini and Claude can cite your pages.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'GEO', 'generative engine optimization', 'AI search optimization', 'AI SEO',
    'get cited by ChatGPT', 'Perplexity optimization', 'llms.txt', 'AI crawler',
    'indie hacker', 'answer engine optimization',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'GEO Audit — Get Cited by ChatGPT, Perplexity & Claude',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GEO Audit — Get Cited by ChatGPT, Perplexity & Claude',
    description: 'Free GEO audit for indie products. 0–100 score, prioritized fixes, Claude Code skill.',
  },
}

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'What is GEO (Generative Engine Optimization)?',
    a: 'GEO is the practice of making your web pages legible and citable to AI answer engines — ChatGPT, Perplexity, Gemini and Claude. When those engines answer a question, they quote and link sources. GEO is the work that makes your page one of those sources.',
  },
  {
    q: 'How is GEO different from SEO?',
    a: 'SEO optimizes for ranking in a list of blue links. GEO optimizes for being read, understood and cited inside a single AI-generated answer. A page can rank #1 on Google and still be invisible to AI — blocked crawlers, no structured data, thin factual density, no direct answer up top.',
  },
  {
    q: 'What does the GrowthHunt GEO audit check?',
    a: 'Eight weighted dimensions across roughly 42 checks: crawler access, indexability & discovery, page structure, schema markup, factual density, entity clarity, content freshness, and whether the opening copy directly answers the page topic.',
  },
  {
    q: 'Is the audit free?',
    a: 'Yes. You get 3 audits per day with no account, and 10 per day with an email. Results are shared in full — every dimension and every fix, nothing gated.',
  },
]

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'GrowthHunt GEO Audit',
  url: PAGE_URL,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description: DESCRIPTION,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'GrowthHunt', url: 'https://growthhunt.ai' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

const STEPS: Array<{ n: string; title: string; body: string }> = [
  { n: '01', title: 'Audit any URL', body: 'Paste a page. We fetch it, run 8 dimensions across ~45 checks, and score the opening copy with AI — in about 10 seconds.' },
  { n: '02', title: 'Get prioritized fixes', body: 'A 0–100 score, an 8-axis breakdown, and a punch list of fixes ordered by impact on AI citation.' },
  { n: '03', title: 'Apply with the Claude skill', body: 'The GEO skill re-runs the audit inside Claude Code, locates the files in your repo, and applies the fixes with a diff you approve.' },
]

export default function GeoPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <TopNav variant="page" />

      <main>
        {/* Hero */}
        <section style={{ padding: '64px 0 56px', borderBottom: '1px solid var(--rule)' }}>
          <div className="shell">
            <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
              <span className="tag live">● Live now</span>
              <span className="tag">Generative Engine Optimization</span>
            </div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 5.6vw, 76px)', fontWeight: 400, lineHeight: 0.98, letterSpacing: '-0.032em', margin: '0 0 20px', maxWidth: 900 }}>
              Get your indie product cited by{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>ChatGPT, Perplexity &amp; Claude</em>.
            </h1>
            <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 560, lineHeight: 1.6, margin: '0 0 32px' }}>
              A free GEO audit for the page you actually care about. A 0–100 score across 8
              dimensions, a prioritized fix list, and a Claude Code skill that applies the fixes.
            </p>
            <GeoAuditForm />
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: '64px 0', borderBottom: '1px solid var(--rule)' }}>
          <div className="shell">
            <div className="eyebrow" style={{ marginBottom: 28 }}><span className="dot" />How it works</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
              {STEPS.map((step) => (
                <div key={step.n}>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 44, color: 'var(--ink-faint)', lineHeight: 1, marginBottom: 12 }}>
                    {step.n}
                  </div>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.6, margin: 0 }}>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: '64px 0', borderBottom: '1px solid var(--rule)' }}>
          <div className="shell" style={{ maxWidth: 760 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 400, letterSpacing: '-0.022em', margin: '0 0 28px' }}>
              GEO questions, <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>answered</em>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {FAQ.map((item) => (
                <details key={item.q} style={{ borderBottom: '1px solid var(--rule)', padding: '18px 0' }}>
                  <summary style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', listStyle: 'none' }}>
                    {item.q}
                  </summary>
                  <p style={{ fontSize: 14.5, color: 'var(--ink-dim)', lineHeight: 1.65, margin: '12px 0 0' }}>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section style={{ padding: '80px 0', textAlign: 'center', background: 'var(--bg-card)' }}>
          <div className="shell" style={{ maxWidth: 680 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.02, margin: '0 0 16px' }}>
              Audit once. <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Fix in Claude Code.</em>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 auto 28px', maxWidth: 480 }}>
              The GEO skill turns this report into applied fixes inside your own repo — and
              continuous monitoring is coming next.
            </p>
            <a
              href="https://github.com/growthhunt/geo-skill"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-line"
              style={{ background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' }}
            >
              Get the GEO skill <span className="arrow">→</span>
            </a>
          </div>
        </section>
      </main>

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
