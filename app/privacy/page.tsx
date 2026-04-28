import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'

export const metadata: Metadata = {
  title: 'Privacy Policy — GrowthHunt',
  description: 'How GrowthHunt and OPChampion handle your data.',
}

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopNav variant="page" />

      <main className="shell" style={{ maxWidth: 720, padding: '64px 24px 96px' }}>
        <div className="eyebrow"><span className="dot"></span>Last updated · April 26, 2026</div>
        <h1 className="serif" style={{ fontSize: 64, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '12px 0 32px' }}>
          Privacy <em>Policy.</em>
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--ink-dim)', marginBottom: 32 }}>
          GrowthHunt (&ldquo;we,&rdquo; the &ldquo;Service&rdquo;) operates growthhunt.ai and the
          OPChampion sub-product. We try to collect as little as possible. If you can read this and
          submit a champion without ever logging in, we don&rsquo;t know who you are. This page tells
          you what we collect when you do log in, and what we do with it.
        </p>

        <Section title="What we collect">
          <ul>
            <li><b>Email + name + avatar URL</b> — when you sign in with Google. We store these in our database to display author names on your champions/comments.</li>
            <li><b>Champions you submit</b> — the product info you publish (name, tagline, description, URL, logo, screenshots).</li>
            <li><b>Comments and upvotes</b> — when you post comments or upvote champions, we store who did it and when.</li>
            <li><b>Hashed IP for anonymous voting</b> — if you upvote without signing in, we hash your IP (sha256) with a daily-rotating salt to enforce one-vote-per-IP-per-day. The raw IP is not stored. After 24 hours the hash is no longer linkable to your IP.</li>
            <li><b>Cookies</b> — a single Supabase auth session cookie when signed in (HttpOnly, SameSite=Lax). No tracking pixels, no third-party advertising cookies.</li>
          </ul>
        </Section>

        <Section title="What we don't collect">
          <ul>
            <li>Your raw IP address (only the daily-rotating hash for vote dedupe).</li>
            <li>Your Google contacts, calendar, or anything outside basic profile.</li>
            <li>Browsing behavior across other websites.</li>
            <li>Payment info (we don&rsquo;t charge for OPChampion).</li>
          </ul>
        </Section>

        <Section title="Where it lives">
          <p>
            Data is stored in <b>Supabase</b> (Postgres + Storage), region <code>ap-southeast-1</code>. Auth is
            <b> Google OAuth</b> brokered by Supabase Auth. Hosting is <b>Vercel</b>.
          </p>
        </Section>

        <Section title="Sharing">
          <p>
            We don&rsquo;t sell your data. We share with:
          </p>
          <ul>
            <li><b>Sub-processors</b> required to run the service (Supabase, Vercel, Google for OAuth).</li>
            <li><b>Law enforcement</b> only when legally required.</li>
          </ul>
        </Section>

        <Section title="Your rights">
          <p>
            Sign in and you can edit or delete anything you posted from your Account page. You can
            also delete your account, which removes your profile, champions, comments, and upvotes.
            For data export or other GDPR/CCPA requests, email us (contact below).
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            One cookie: the Supabase session token (`sb-*-auth-token`). Set when you sign in.
            HttpOnly, SameSite=Lax, expires when the session expires or you sign out.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy: <a style={{ color: 'var(--accent)' }} href="mailto:hello@growthhunt.ai">hello@growthhunt.ai</a>.
          </p>
        </Section>

        <p style={{ marginTop: 64, fontSize: 13, color: 'var(--ink-faint)' }}>
          By using growthhunt.ai/OPChampion you agree to this policy. We may update it from time to
          time; the &ldquo;last updated&rdquo; date at the top reflects the most recent revision.
        </p>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 className="serif" style={{ fontSize: 26, margin: '0 0 12px' }}>{title}</h2>
      <div style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink-dim)' }}>{children}</div>
    </section>
  )
}
