import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'

export const metadata: Metadata = {
  title: 'X Grower Privacy Policy — GrowthHunt',
  description: 'How X Grower (the GrowthHunt Chrome extension) handles your data.',
  alternates: { canonical: 'https://growthhunt.ai/xgrower/privacy' },
}

export default function XGrowerPrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopNav variant="page" />

      <main className="shell" style={{ maxWidth: 720, padding: '64px 24px 96px' }}>
        <div className="eyebrow"><span className="dot"></span>Last updated · May 18, 2026</div>
        <h1 className="serif" style={{ fontSize: 64, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '12px 0 32px' }}>
          X Grower <em>Privacy.</em>
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--ink-dim)', marginBottom: 32 }}>
          X Grower is the Chrome extension published by GrowthHunt.ai that generates AI-powered reply
          drafts on x.com. This page explains, in plain terms, what data the extension collects, what
          it does with that data, and what it deliberately does not touch.
        </p>

        <Section title="What we collect">
          <ul>
            <li><b>Email address</b> — when you sign up or sign in. Used to identify your account and enforce per-user quota.</li>
            <li><b>Authentication session tokens</b> — issued by Supabase Auth, stored locally in <code>chrome.storage.local</code> on your device. Used to authorize API calls to our backend.</li>
            <li><b>&ldquo;About Me&rdquo; text and template settings</b> — what you type in the popup to personalize your replies. Stored in <code>chrome.storage.sync</code> so it follows your Chrome profile across devices, and sent with each generation request so the AI can match your voice.</li>
            <li><b>Reply usage counters</b> — how many replies you have generated today and this month. Stored server-side so we can enforce free/Pro quota.</li>
            <li><b>IDs of tweets you have replied to via the extension</b> — stored locally on your device only. Used so the batch mode (Auto Burst) never double-replies to the same tweet.</li>
            <li><b>Tweet content, transiently</b> — when you click a template button on a tweet, the text of that tweet is sent to our backend so the AI knows the context. We do not persist this text after the response is returned.</li>
          </ul>
        </Section>

        <Section title="What we don't collect">
          <ul>
            <li>Your direct messages on X.</li>
            <li>Tweets you have not explicitly clicked to reply to.</li>
            <li>Browsing history outside of x.com / twitter.com / growthhunt.ai / our Supabase project.</li>
            <li>Page contents from any other website you visit.</li>
            <li>Payment information (Pro is currently invite-only; no payment is collected).</li>
            <li>Advertising or tracking identifiers.</li>
          </ul>
        </Section>

        <Section title="Where it lives">
          <p>
            Your account and usage data lives in <b>Supabase</b> (Postgres + Storage), region <code>ap-southeast-1</code>.
            Authentication is brokered by Supabase Auth, with optional Google OAuth via <code>chrome.identity</code>.
            Reply generation runs on our <b>Vercel</b> backend at <code>www.growthhunt.ai/api/xgrower/*</code>,
            which calls <b>MiniMax</b> as the LLM provider. Tweet text passed to MiniMax is not retained beyond standard transient processing.
          </p>
        </Section>

        <Section title="Why the extension uses chrome.debugger">
          <p>
            X (Twitter) rejects synthetic JavaScript click events (events with <code>isTrusted=false</code>)
            on its Reply send button as part of its anti-automation defense. To allow you to submit a
            draft you have reviewed, the extension briefly attaches the Chrome DevTools Protocol to
            your active x.com tab and dispatches a real input event on the Send button. The attachment
            is opened on each send, used for a single click sequence, and detached immediately.
          </p>
          <p style={{ marginTop: 12 }}>
            <b>chrome.debugger is never used to read page data, intercept network requests, or monitor
            your activity</b> — only to dispatch a click on a button you have authorized the extension to press.
          </p>
        </Section>

        <Section title="Sharing">
          <p>
            We do not sell your data. We share with:
          </p>
          <ul>
            <li><b>Sub-processors</b> required to run the service: Supabase (database + auth), Vercel (hosting), MiniMax (LLM generation), Google (only if you choose Google Sign-In).</li>
            <li><b>Law enforcement</b> only when legally required.</li>
          </ul>
        </Section>

        <Section title="Data retention">
          <ul>
            <li>Account data and usage counters: kept until you delete your account.</li>
            <li>Replied-tweet IDs: stored on your device; cleared when you uninstall the extension or clear extension storage.</li>
            <li>Tweet content sent for generation: not retained after the response is returned.</li>
          </ul>
        </Section>

        <Section title="Your rights">
          <p>
            You can sign out from the popup at any time to clear your local session. You can uninstall
            the extension to remove all on-device storage. To delete your account and all server-side
            usage data, or to request a data export, email us at the address below — we will action
            requests within 30 days.
          </p>
        </Section>

        <Section title="Children">
          <p>
            X Grower is not directed to users under 13. We do not knowingly collect data from children.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update this policy as the product evolves. Material changes will be announced via
            the extension popup or by email to registered users. The &ldquo;last updated&rdquo; date at
            the top reflects the most recent revision.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy: <a style={{ color: 'var(--accent)' }} href="mailto:hello@growthhunt.ai">hello@growthhunt.ai</a>.
          </p>
        </Section>

        <p style={{ marginTop: 64, fontSize: 13, color: 'var(--ink-faint)' }}>
          By installing X Grower you agree to this policy.
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
