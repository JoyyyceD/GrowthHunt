import type { Metadata } from 'next'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'

export const metadata: Metadata = {
  title: 'Get your "Featured on Velocity" badge',
  description:
    'Embed the GrowthHunt Velocity badge on your site, README, or landing page — show that you are one of the fastest-moving things in AI.',
  alternates: { canonical: 'https://growthhunt.ai/velocity/badge' },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/velocity/badge',
    title: 'Get your "Featured on Velocity" badge',
    description:
      'Embed the GrowthHunt Velocity badge — show you are one of the fastest-growing things in AI.',
  },
}

const EMBED_LIGHT = `<a href="https://growthhunt.ai/velocity" target="_blank" rel="noopener">
  <img src="https://growthhunt.ai/velocity-badge.svg"
       alt="Featured on GrowthHunt Velocity" width="248" height="56" />
</a>`

const EMBED_DARK = `<a href="https://growthhunt.ai/velocity" target="_blank" rel="noopener">
  <img src="https://growthhunt.ai/velocity-badge-dark.svg"
       alt="Featured on GrowthHunt Velocity" width="248" height="56" />
</a>`

const EMBED_MD = `[![Featured on GrowthHunt Velocity](https://growthhunt.ai/velocity-badge.svg)](https://growthhunt.ai/velocity)`

const preStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 12.5,
  background: 'var(--bg-card)',
  border: '1px solid var(--rule)',
  borderRadius: 10,
  padding: '16px 18px',
  overflowX: 'auto',
  lineHeight: 1.6,
  color: 'var(--ink)',
  margin: '12px 0 0',
  whiteSpace: 'pre',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--ink-faint)',
}

function BadgeBlock({
  title,
  bg,
  img,
  code,
}: {
  title: string
  bg: string
  img: string
  code: string
}) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={labelStyle}>{title}</div>
      <div
        style={{
          marginTop: 12,
          padding: '28px',
          background: bg,
          border: '1px solid var(--rule)',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="Featured on GrowthHunt Velocity" width={248} height={56} />
      </div>
      <pre style={preStyle}>{code}</pre>
    </div>
  )
}

export default function VelocityBadgePage() {
  return (
    <>
      <TopNav variant="page" />
      <main style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' }}>
        <section style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px 96px' }}>
          <Link href="/velocity" className="detail-back">
            ← Velocity
          </Link>

          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(40px, 6vw, 68px)',
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
              fontWeight: 400,
              margin: '20px 0 16px',
            }}
          >
            On the leaderboard?
            <br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Grab your badge.</em>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: 'var(--ink-dim)',
              lineHeight: 1.6,
              maxWidth: 560,
              margin: '0 0 48px',
            }}
          >
            If your repo, your account, or your product showed up on{' '}
            <Link href="/velocity" style={{ color: 'var(--accent)' }}>
              GrowthHunt Velocity
            </Link>
            , embed the badge on your site or README. It links back to the live leaderboard —
            free social proof for you, and it helps more builders find the page.
          </p>

          <BadgeBlock
            title="Light badge — HTML"
            bg="#ffffff"
            img="/velocity-badge.svg"
            code={EMBED_LIGHT}
          />
          <BadgeBlock
            title="Dark badge — HTML"
            bg="#14110d"
            img="/velocity-badge-dark.svg"
            code={EMBED_DARK}
          />

          <div style={{ marginBottom: 8 }}>
            <div style={labelStyle}>Markdown (for a GitHub README)</div>
            <pre style={preStyle}>{EMBED_MD}</pre>
          </div>

          <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 32, lineHeight: 1.6 }}>
            The badge is a plain SVG — it loads instantly and never tracks your visitors. Velocity
            refreshes every Monday; check the{' '}
            <Link href="/velocity" style={{ color: 'var(--ink-dim)' }}>
              live leaderboard
            </Link>{' '}
            to see where you rank this week.
          </p>
        </section>
      </main>
    </>
  )
}
