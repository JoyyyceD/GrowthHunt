import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { GeoAuditForm } from './GeoAuditForm'

const PAGE_URL = 'https://growthhunt.ai/geo'
const TITLE = 'GEO Audit — Get Your Product Cited in AI Answers'
const DESCRIPTION =
  'Free Generative Engine Optimization audit. Drop a URL and get a 0–100 score across 8 dimensions, a prioritized fix list you can export as Markdown, and a skill that applies the fixes in your AI editor — so your pages get cited when AI answers questions.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'GEO', 'generative engine optimization', 'AI search optimization', 'AI SEO',
    'get cited by AI', 'answer engine optimization', 'llms.txt', 'AI crawler',
    'ChatGPT', 'Perplexity', 'indie hacker',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'GEO Audit — Get Cited in AI Answers',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GEO Audit — Get Cited in AI Answers',
    description: 'Free GEO audit for indie products. 0–100 score, prioritized fixes, a Markdown report, a skill.',
  },
}

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'What is GEO (Generative Engine Optimization)?',
    a: 'GEO is the practice of making your web pages legible and citable to AI answer engines like ChatGPT or Perplexity. When an AI answers a question, it quotes and links sources — GEO is the work that makes your page one of those sources.',
  },
  {
    q: 'How is GEO different from SEO?',
    a: 'SEO optimizes for ranking in a list of blue links. GEO optimizes for being read, understood and cited inside a single AI-generated answer. A page can rank #1 on Google and still be invisible to AI — blocked crawlers, no structured data, thin factual density, no direct answer up top.',
  },
  {
    q: 'What does the GrowthHunt GEO audit check?',
    a: 'Eight weighted dimensions across roughly 45 checks: crawler access, indexability & discovery, page structure, schema markup, factual density, entity clarity, content freshness, and whether the opening copy directly answers the page topic.',
  },
  {
    q: 'Is the audit free?',
    a: 'Yes. You get 3 audits per day with no account, and 10 per day with an email. Results are shared in full — every dimension and every fix, nothing gated — and you can export the whole report as Markdown.',
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

// Technical signals an AI-readiness audit touches — a texture strip, not a brand list.
const STRIP = [
  'OAI-SearchBot', 'GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended',
  'Bingbot', 'Applebot-Extended', 'llms.txt', 'robots.txt', 'JSON-LD',
  'schema.org', 'sitemap.xml',
]

const DIMENSIONS: Array<{ w: number; name: string; blurb: string }> = [
  { w: 13, name: 'Crawler Access', blurb: 'Can AI answer-engine crawlers actually fetch the page?' },
  { w: 12, name: 'Indexability & Discovery', blurb: 'sitemap, canonical and llms.txt — so engines can find every page.' },
  { w: 15, name: 'Structure', blurb: 'Headings, lists and an FAQ section an AI can parse and lift.' },
  { w: 12, name: 'Schema', blurb: 'JSON-LD structured data that tells engines what each page is.' },
  { w: 13, name: 'Factual Density', blurb: 'Numbers, dates and sourced claims — the stuff AI loves to cite.' },
  { w: 10, name: 'Entity Clarity', blurb: 'Your brand named consistently across title, H1 and copy.' },
  { w: 10, name: 'Freshness', blurb: 'Dated, recently-updated content beats stale pages.' },
  { w: 15, name: 'First Answer', blurb: 'Do the first 80 words directly answer the page’s question?' },
]

const STEPS: Array<{ n: string; title: string; body: string }> = [
  { n: '01', title: 'Audit any URL', body: 'Paste a page. We fetch it, run 8 dimensions across ~45 checks, and score the opening copy with AI — in about 10 seconds.' },
  { n: '02', title: 'Get prioritized fixes', body: 'A 0–100 score, an 8-axis breakdown, and a punch list of fixes ordered by impact on whether AI cites you.' },
  { n: '03', title: 'Export & apply', body: 'Download the full report as Markdown and hand it to your AI editor — Claude Code, Cursor, Windsurf. Or run the GEO skill, which re-audits and applies the fixes for you.' },
]

const MOCK_DIMS: Array<{ name: string; pct: number }> = [
  { name: 'Crawler Access', pct: 92 },
  { name: 'Discovery', pct: 70 },
  { name: 'Structure', pct: 64 },
  { name: 'Schema', pct: 80 },
  { name: 'Factual Density', pct: 38 },
  { name: 'First Answer', pct: 45 },
]

function barColor(pct: number): string {
  if (pct >= 70) return '#16a34a'
  if (pct >= 45) return 'var(--warn)'
  return '#c0392b'
}

export default function GeoPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <TopNav variant="page" />

      <main>
        {/* ── Hero ── */}
        <section id="top" style={{ position: 'relative', overflow: 'hidden', padding: '72px 0 60px', borderBottom: '1px solid var(--rule)' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute', fontFamily: 'var(--serif)', fontStyle: 'italic',
              fontSize: '40vw', lineHeight: 0.8, color: 'rgba(232,78,27,0.05)',
              top: '-12vw', right: '-6vw', pointerEvents: 'none', userSelect: 'none',
            }}
          >
            GEO
          </div>
          <div className="shell" style={{ position: 'relative' }}>
            <div className="eyebrow" style={{ marginBottom: 20 }}>
              <span className="dot" />Generative Engine Optimization · free audit
            </div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 5.4vw, 74px)', fontWeight: 400, lineHeight: 1.0, letterSpacing: '-0.032em', margin: '0 0 20px', maxWidth: 900 }}>
              Get your indie product{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>cited in AI answers</em>.
            </h1>
            <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 580, lineHeight: 1.6, margin: '0 0 32px' }}>
              A free GEO audit for the page you actually care about. A 0–100 score across 8
              dimensions, a prioritized fix list you can export as Markdown, and a skill that
              applies the fixes in your AI editor.
            </p>
            <GeoAuditForm />
            <div style={{ marginTop: 24, display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13.5 }}>
              <Link href="/geo/compete" style={{ color: 'var(--ink-dim)', textDecoration: 'none' }}>
                → Side-by-side <strong style={{ color: 'var(--ink)' }}>vs competitors</strong>
              </Link>
              <Link href="/geo/site" style={{ color: 'var(--ink-dim)', textDecoration: 'none' }}>
                → Audit <strong style={{ color: 'var(--ink)' }}>your whole site</strong>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Signals marquee ── */}
        <div className="strip">
          <div className="strip-track">
            <span>{STRIP.join('     ·     ')}</span>
            <span>{STRIP.join('     ·     ')}</span>
          </div>
        </div>

        {/* ── Why it matters ── */}
        <section style={{ padding: '80px 0', borderBottom: '1px solid var(--rule)' }}>
          <div className="shell" style={{ maxWidth: 720 }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />Why it matters</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 400, letterSpacing: '-0.022em', lineHeight: 1.08, margin: '0 0 28px' }}>
              AI answers cite sources. <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Right now it isn’t you.</em>
            </h2>

            <div style={{ border: '1px solid var(--rule)', borderRadius: 14, background: 'var(--bg-elev)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--rule)', background: 'var(--bg-card)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                An AI answer
              </div>
              <div style={{ padding: '22px 24px' }}>
                <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--ink-dim)' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)' }}>Q&nbsp;&nbsp;</span>
                  &ldquo;What&apos;s the best AI writing tool for solo founders?&rdquo;
                </p>
                <p style={{ margin: '0 0 16px', fontSize: 15.5, color: 'var(--ink)', lineHeight: 1.65 }}>
                  Based on current sources, the strongest options are{' '}
                  <strong>Competitor&nbsp;A</strong>, <strong>Competitor&nbsp;B</strong> and{' '}
                  <strong>Competitor&nbsp;C</strong> — each cited from their docs and comparison pages.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {['competitor-a.com', 'competitor-b.com', 'competitor-c.com'].map((c) => (
                    <span key={c} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 4, padding: '3px 8px' }}>
                      {c}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px dashed var(--rule-strong)', paddingTop: 14 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', textDecoration: 'line-through' }}>
                    yourproduct.com
                  </span>
                  <span style={{ fontSize: 12, color: '#c0392b', fontWeight: 600 }}>not cited</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 14.5, color: 'var(--ink-dim)', lineHeight: 1.65, margin: '20px 0 0' }}>
              If your pages aren&apos;t readable to AI — blocked crawlers, no structured data,
              no direct answer up top — this is you. The audit tells you exactly why, and how to fix it.
            </p>
          </div>
        </section>

        {/* ── Sample report ── */}
        <section style={{ borderBottom: '1px solid var(--rule)' }}>
          <div className="shell">
            <div className="feature">
              <div className="copy">
                <div className="eyebrow" style={{ marginBottom: 12 }}><span className="dot" />The report</div>
                <h3>See exactly what an AI sees.</h3>
                <p>
                  Every audit returns a 0–100 score, an 8-dimension breakdown, a high/medium/low
                  rating per engine, and a fix list ordered by impact — and you can export the
                  whole thing as a Markdown file.
                </p>
                <p style={{ marginBottom: 0 }}>
                  No gated categories, no &ldquo;upgrade to see more.&rdquo; The whole report, every time.
                </p>
              </div>
              <div className="mock">
                <div className="mock-header">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                  <span className="url">growthhunt.ai/geo</span>
                </div>
                <div className="mock-body">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                      GEO Score
                    </span>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, color: 'var(--warn)', marginLeft: 'auto' }}>73</span>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink-faint)' }}>/100</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: '#fff', background: 'var(--warn)', borderRadius: 4, padding: '2px 7px' }}>B</span>
                  </div>
                  {MOCK_DIMS.map((d) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 11 }}>
                      <span style={{ width: 110, color: 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <span style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--bg-card)', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${d.pct}%`, background: barColor(d.pct) }} />
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-faint)', width: 26, textAlign: 'right' }}>{d.pct}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-dim)' }}>
                    <span><span style={{ color: '#16a34a' }}>●</span> ChatGPT</span>
                    <span><span style={{ color: 'var(--warn)' }}>◐</span> Perplexity</span>
                    <span><span style={{ color: 'var(--warn)' }}>◐</span> Gemini</span>
                    <span><span style={{ color: '#16a34a' }}>●</span> Claude</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── What we audit ── */}
        <section style={{ padding: '80px 0', borderBottom: '1px solid var(--rule)' }}>
          <div className="shell">
            <div className="eyebrow" style={{ marginBottom: 14 }}><span className="dot" />What we audit</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 400, letterSpacing: '-0.022em', margin: '0 0 36px', maxWidth: 640 }}>
              8 dimensions. <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>~45 checks.</em>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
              {DIMENSIONS.map((d) => (
                <div key={d.name} style={{ background: 'var(--bg)', padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 150 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.04em' }}>
                    {d.w}% weight
                  </span>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 22, letterSpacing: '-0.015em' }}>{d.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.55 }}>{d.blurb}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section style={{ padding: '80px 0', borderBottom: '1px solid var(--rule)' }}>
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

        {/* ── FAQ ── */}
        <section style={{ padding: '80px 0', borderBottom: '1px solid var(--rule)' }}>
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

        {/* ── Closing CTA ── */}
        <section className="closing">
          <div className="shell">
            <div className="eyebrow" style={{ marginBottom: 22 }}><span className="dot" />Get cited</div>
            <h2>Audit your page. <em>Fix it in your AI editor.</em></h2>
            <p>
              Run a free GEO audit, export the report, and let the skill apply the fixes in your
              own repo — and continuous monitoring is coming next.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
              <a href="#top" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 26px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Run a free audit ↑
              </a>
              <a
                href="https://github.com/JoyyyceD/geo-skill"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--rule-strong)', padding: '14px 26px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
              >
                Get the GEO skill →
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--rule)', padding: '24px 0', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'none' }}>← All tools</Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}
