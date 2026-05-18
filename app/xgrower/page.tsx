import type React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { fetchXGrowerStats } from '@/lib/xgrower/x-stats'
import { AnimatedCounter } from './AnimatedCounter'

export const revalidate = 1800 // 30 min — match the x-stats cache window

// Swap to the specific status URL once the pinned tweet is live.
const PINNED_TWEET_URL = 'https://x.com/Felixisbuilding'

export const metadata: Metadata = {
  title: 'X Grower — 0 → 1,000 followers for indie founders on X',
  description:
    '0 → 1,000 followers for indie founders on X. AI reply Chrome extension, built by an indie founder using it on his own account. Free tier: 10 replies/day, 100/month. Pro: $9/mo for the first 500 paid users (lifetime locked), then $19/mo.',
  keywords: [
    'x growth tool',
    'twitter follower growth',
    'ai reply tool',
    'indie hacker',
    'twitter automation',
    'x follower bot',
  ],
  alternates: { canonical: 'https://growthhunt.ai/xgrower' },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/xgrower',
    title: 'X Grower — 0 → 1,000 followers for indie founders on X',
    description:
      '0 → 1,000 followers for indie founders on X. AI reply Chrome extension, built by an indie founder on his own account. Free tier: 10/day, 100/month. Pro: $9/mo (first 500 lifetime locked), then $19/mo.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'X Grower — 0 → 1,000 followers for indie founders on X',
    description:
      '0 → 1,000 followers for indie founders on X. AI reply Chrome extension, built by an indie founder on his own account. Free tier: 10/day, 100/month. Pro: $9/mo (first 500 lifetime locked), then $19/mo.',
  },
}

const FAQS = [
  {
    q: 'Will my X account get banned?',
    a: 'Honest answer: any automation carries some risk. The builder runs this exact loop on his own account every day and has not been flagged — but that\'s n=1, not a guarantee. We add randomized human-like behavior (bezier mouse paths, character-by-character typing, scroll simulation, randomized delays) to reduce detection risk, and if your account does get banned we refund your unused credit. If you\'re cautious, run it on a non-critical X account first.',
  },
  {
    q: 'When and how do I pay?',
    a: 'You don\'t have to. The free tier gives every new account 10 replies/day and up to 100/month — no card, forever. If you want unlimited replies, Pro is a LemonSqueezy subscription, cancel any time, with a dual-price tier: the first 500 paid users lock $9/mo for life (founding cohort), and from the 501st paid user onwards it\'s $19/mo standard. Separately, the first 100 X users to reply "I\'m in" on Felix\'s pinned tweet get an invite code that unlocks 30 days of Pro free. The 30-day trial is independent of the price lock — when the trial ends and a holder converts to paid, they get $9/mo lifetime if paid-user count is still under 500, otherwise $19/mo.',
  },
  {
    q: 'Do you store my X password?',
    a: 'No. The extension runs inside your own Chrome browser, where you are already logged in to X. We never see your X cookie, password, or DMs. We only see the post text you reply to and the AI-generated draft.',
  },
  {
    q: 'How does follower growth actually work?',
    a: 'You search for posts in growth-relevant keywords, the extension generates an encouraging reply via our hosted AI, dispatches it as a reply, and moves to the next post. Your account becomes visible to active users in those threads. Some follow back. Real example: Felix, the builder, went from 0 to 76 followers in 4 days using this exact loop.',
  },
  {
    q: 'Can I customize the reply tone?',
    a: 'V1 ships with one tone — "Encourager" — because it is the validated highest-conversion template. Future versions will let you add custom templates per niche.',
  },
  {
    q: 'Is this Chrome extension public?',
    a: 'V1 launches as a sideload (Chrome → Developer mode → Load unpacked). Chrome Web Store version is in review (~2 weeks). Sideload guide is included in your dashboard after signup.',
  },
  {
    q: 'Does this work on Mac / Windows / Linux?',
    a: 'Anywhere desktop Chrome runs. Mobile Chrome / Safari / Firefox are not supported in V1.',
  },
  {
    q: 'What about refunds?',
    a: 'If your X account gets banned, submit a screenshot via support and we refund your unused credit balance.',
  },
]

export default async function XGrowerLandingPage() {
  const stats = await fetchXGrowerStats()
  return (
    <>
      <TopNav variant="page" />
      <main style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' }}>
        {/* HERO */}
        <section style={{ padding: '80px 24px 60px', maxWidth: 1080, margin: '0 auto' }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--mono)',
              color: 'var(--ink-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              padding: '4px 10px',
              border: '1px solid var(--rule)',
              borderRadius: 999,
              display: 'inline-block',
              marginBottom: 28,
            }}
          >
            v1 · sideload beta · free tier: 10/day, 100/month
          </div>

          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(48px, 8vw, 96px)',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              margin: '0 0 24px',
              fontWeight: 400,
            }}
          >
            0 <span style={{ color: 'var(--accent)' }}>→ 1,000</span> followers
            for indie founders on X.
          </h1>

          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(22px, 3vw, 32px)',
              lineHeight: 1.3,
              color: 'var(--ink)',
              maxWidth: 820,
              margin: '0 0 40px',
            }}
          >
            I built it to grow my own X account. I&apos;m at{' '}
            <span style={{ color: 'var(--accent)' }}>
              <AnimatedCounter to={stats.followers} />
            </span>{' '}
            followers in{' '}
            <span style={{ color: 'var(--accent)' }}>
              <AnimatedCounter to={stats.daysSinceStart} />
            </span>{' '}
            days, and I&apos;m letting other indie founders run the same loop.
            <br />
            <span style={{ color: 'var(--ink-dim)', fontSize: '0.7em' }}>
              The extension runs in your own Chrome — we never see your X
              password or cookie.
            </span>
          </p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 56 }}>
            <Link
              href="/xgrower/install"
              style={{
                fontSize: 16,
                fontWeight: 600,
                padding: '14px 28px',
                borderRadius: 999,
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Start free (10 replies/day) →
            </Link>
            <span style={{ fontSize: 14, color: 'var(--ink-dim)' }}>
              No card. Upgrade to Pro any time — {stats.proPriceFoundingMonthly}/mo lifetime if you&apos;re in the first 500 paid users, {stats.proPriceStandardMonthly}/mo after.
            </span>
          </div>

          {/* Social proof — Felix's account */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 24,
              padding: '32px 0',
              borderTop: '1px solid var(--rule)',
              borderBottom: '1px solid var(--rule)',
              maxWidth: 900,
            }}
          >
            <Stat label="Days" value={<AnimatedCounter to={stats.daysSinceStart} />} />
            <Stat
              label="New followers"
              value={
                <>
                  +<AnimatedCounter to={stats.followers} />
                </>
              }
            />
            <Stat
              label="Replies shipped"
              sublabel="from Felix's account"
              value={
                <>
                  +<AnimatedCounter to={stats.posts} />
                </>
              }
            />
            <Stat
              label="Pro"
              sublabel={`first 500 paid users lifetime, then ${stats.proPriceStandardMonthly}/mo · free: ${stats.freeRepliesPerDay}/day, ${stats.freeRepliesPerMonth}/mo`}
              value={`${stats.proPriceFoundingMonthly}/mo`}
            />
          </div>

          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-faint)' }}>
            Real data from{' '}
            <a
              href="https://x.com/Felixisbuilding"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--ink-dim)' }}
            >
              @Felixisbuilding
            </a>{' '}
            — the builder behind X Grower.
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section
          style={{
            padding: '80px 24px',
            background: 'var(--bg-elev)',
            borderTop: '1px solid var(--rule)',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(36px, 5vw, 56px)',
                margin: '0 0 12px',
                fontWeight: 400,
              }}
            >
              How it works
            </h2>
            <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 640, margin: '0 0 56px' }}>
              Three clicks from install to your first 30 replies. No coding, no API keys, no setup.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
              <Step
                num="01"
                title="Install the extension"
                body="One-click sideload in Chrome. Sign in with Google. We never see your X password — the extension runs in your own browser."
              />
              <Step
                num="02"
                title="Pick your keyword + Start Burst"
                body="Default keyword is X follower growth. Click Start. The extension automatically searches X, picks active posts, and generates a reply for each."
              />
              <Step
                num="03"
                title="Walk away for 30 minutes"
                body="The extension dispatches 30+ replies with human-like timing. People active in those threads see your reply. Some follow back. Repeat tomorrow."
              />
            </div>
          </div>
        </section>

        {/* TRY-FIRST · soft alternative to a pricing section */}
        <section style={{ padding: '80px 24px', maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--mono)',
              color: 'var(--accent)',
              letterSpacing: '0.12em',
              marginBottom: 16,
            }}
          >
            START / FREE
          </div>
          <h2
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(36px, 5vw, 56px)',
              margin: '0 0 24px',
              fontWeight: 400,
              lineHeight: 1.1,
            }}
          >
            See if it works for you. <em style={{ color: 'var(--accent)' }}>First.</em>
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--ink-dim)', maxWidth: 640, margin: '0 auto 32px' }}>
            Every new account starts on the{' '}
            <b style={{ color: 'var(--ink)', fontWeight: 500 }}>
              free tier — {stats.freeRepliesPerDay} replies/day, {stats.freeRepliesPerMonth}/month
            </b>
            , no card. Run a few bursts from your own X account, watch your follower count, then decide whether to upgrade.
          </p>
          <Link
            href="/xgrower/install"
            style={{
              fontSize: 16,
              fontWeight: 600,
              padding: '14px 28px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Start free ({stats.freeRepliesPerDay} replies/day) →
          </Link>
          <p style={{ marginTop: 24, fontSize: 13, color: 'var(--ink-faint)' }}>
            Pro is <span style={{ color: 'var(--ink-dim)' }}>{stats.proPriceFoundingMonthly}/mo lifetime</span> for the first 500 paid users, then {stats.proPriceStandardMonthly}/mo. Cancel any time.
          </p>

          <div
            style={{
              marginTop: 80,
              marginBottom: 16,
              fontSize: 11,
              fontFamily: 'var(--mono)',
              color: 'var(--accent)',
              letterSpacing: '0.12em',
            }}
          >
            OR / FOUNDING COHORT
          </div>
          <h3
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(28px, 3.6vw, 40px)',
              margin: '0 0 16px',
              fontWeight: 400,
              lineHeight: 1.15,
            }}
          >
            Reply &ldquo;<em style={{ color: 'var(--accent)' }}>I&apos;m in</em>&rdquo; — get 30 days of Pro free.
          </h3>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--ink-dim)', maxWidth: 560, margin: '0 auto 28px' }}>
            First 100 people to reply on the pinned tweet below unlock 30 days of Pro, stacked on top of the founding {stats.proPriceFoundingMonthly}/mo lifetime price.
          </p>

          <TweetCard
            href={PINNED_TWEET_URL}
            name="Felix"
            handle="@Felixisbuilding"
            avatarLetter="F"
            body={
              <>
                Built X Grower — a Chrome extension that took my own X account from 0 → {stats.followers} followers in {stats.daysSinceStart} days as an indie founder.
                <br />
                <br />
                First 100 people to reply <b style={{ color: 'var(--ink)' }}>&ldquo;I&apos;m in&rdquo;</b> get 30 days of Pro free. (After that: {stats.proPriceFoundingMonthly}/mo lifetime for the first 500 paid users, {stats.proPriceStandardMonthly}/mo standard.)
              </>
            }
            cta="Reply on X →"
          />
        </section>

        {/* FAQ */}
        <section
          style={{
            padding: '80px 24px',
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--rule)',
          }}
        >
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(36px, 5vw, 56px)',
                margin: '0 0 40px',
                fontWeight: 400,
              }}
            >
              Frequently asked
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {FAQS.map(({ q, a }, i) => (
                <details
                  key={i}
                  style={{
                    borderBottom: '1px solid var(--rule)',
                    padding: '20px 0',
                  }}
                >
                  <summary
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 22,
                      cursor: 'pointer',
                      listStyle: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    {q}
                    <span style={{ color: 'var(--ink-faint)', fontSize: 16, fontFamily: 'var(--mono)' }}>+</span>
                  </summary>
                  <p
                    style={{
                      marginTop: 12,
                      fontSize: 16,
                      lineHeight: 1.6,
                      color: 'var(--ink-dim)',
                    }}
                  >
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding: '100px 24px', textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(40px, 6vw, 72px)',
              margin: '0 0 24px',
              fontWeight: 400,
              lineHeight: 1.1,
            }}
          >
            Build the <em style={{ color: 'var(--accent)' }}>audience</em>
            <br />
            you keep telling yourself
            <br />
            you&apos;ll build.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--ink-dim)', maxWidth: 540, margin: '0 auto 32px' }}>
            {stats.freeRepliesPerDay} replies/day. No card. Five minutes.
          </p>
          <Link
            href="/xgrower/install"
            style={{
              fontSize: 16,
              fontWeight: 600,
              padding: '14px 28px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: 8,
            }}
          >
            Start free →
          </Link>
          <p style={{ marginTop: 32, fontSize: 13, color: 'var(--ink-faint)' }}>
            <Link href="/terms" style={{ color: 'var(--ink-faint)' }}>Terms</Link>
            {' · '}
            <Link href="/privacy" style={{ color: 'var(--ink-faint)' }}>Privacy</Link>
            {' · '}
            <a href="https://x.com/Felixisbuilding" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-faint)' }}>
              Built by @Felixisbuilding
            </a>
          </p>
        </section>
      </main>
    </>
  )
}

function Stat({
  label,
  value,
  sublabel,
}: {
  label: string
  value: React.ReactNode
  sublabel?: string
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(32px, 4.5vw, 48px)',
          color: 'var(--ink)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--mono)',
          color: 'var(--ink-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
          marginTop: 8,
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--mono)',
            color: 'var(--ink-faint)',
            letterSpacing: '0.06em',
            marginTop: 3,
            opacity: 0.7,
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  )
}

function TweetCard({
  href,
  name,
  handle,
  avatarLetter,
  body,
  cta,
}: {
  href: string
  name: string
  handle: string
  avatarLetter: string
  body: React.ReactNode
  cta: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textAlign: 'left',
        maxWidth: 540,
        margin: '0 auto',
        padding: '24px 26px 20px',
        background: 'var(--bg)',
        border: '1px solid var(--rule)',
        borderRadius: 18,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--serif)',
            fontSize: 22,
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {avatarLetter}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{name}</span>
          <span
            style={{
              fontSize: 13,
              color: 'var(--ink-faint)',
              fontFamily: 'var(--mono)',
            }}
          >
            {handle} · pinned
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: 16,
          lineHeight: 1.55,
          color: 'var(--ink)',
          marginBottom: 16,
        }}
      >
        {body}
      </div>

      <div
        style={{
          borderTop: '1px solid var(--rule)',
          paddingTop: 12,
          fontSize: 13,
          fontFamily: 'var(--mono)',
          color: 'var(--accent)',
          letterSpacing: '0.04em',
        }}
      >
        {cta}
      </div>
    </a>
  )
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--mono)',
          color: 'var(--accent)',
          letterSpacing: '0.12em',
          marginBottom: 16,
        }}
      >
        STEP / {num}
      </div>
      <h3
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 28,
          margin: '0 0 12px',
          fontWeight: 400,
          lineHeight: 1.2,
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-dim)', margin: 0 }}>{body}</p>
    </div>
  )
}

