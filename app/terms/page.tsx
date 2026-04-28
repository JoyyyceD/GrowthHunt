import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'

export const metadata: Metadata = {
  title: 'Terms of Service — GrowthHunt',
  description: 'The basic ground rules for using GrowthHunt and OPChampion.',
}

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopNav variant="page" />

      <main className="shell" style={{ maxWidth: 720, padding: '64px 24px 96px' }}>
        <div className="eyebrow"><span className="dot"></span>Last updated · April 26, 2026</div>
        <h1 className="serif" style={{ fontSize: 64, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '12px 0 32px' }}>
          Terms of <em>Service.</em>
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--ink-dim)', marginBottom: 32 }}>
          These are the rules for using GrowthHunt (&ldquo;the Service&rdquo;) and the OPChampion
          sub-product. By using the Service you agree to them. They&rsquo;re short on purpose.
        </p>

        <Section title="Eligibility">
          <p>You must be at least 13 years old to use the Service. If you submit on behalf of a
          company, you must have authority to bind that company.</p>
        </Section>

        <Section title="What you can do">
          <ul>
            <li>Browse, upvote, and comment on champions.</li>
            <li>Submit your own one-person company / project for inclusion.</li>
            <li>Edit or delete your own submissions, comments, and account at any time.</li>
          </ul>
        </Section>

        <Section title="What you can't do">
          <ul>
            <li>Submit content you don&rsquo;t own or have rights to (no impersonation, no copying others).</li>
            <li>Spam, manipulate vote counts, or use multiple accounts to inflate metrics.</li>
            <li>Post hateful, harassing, illegal, sexually explicit, or malware-related content.</li>
            <li>Scrape the Service in a way that materially burdens our infrastructure.</li>
            <li>Reverse engineer, copy the database, or build a competing product directly off our data.</li>
          </ul>
        </Section>

        <Section title="Your content, your rights">
          <p>
            You keep ownership of everything you post. By posting, you grant us a non-exclusive,
            worldwide, royalty-free license to host, display, and reproduce that content as needed
            to operate the Service (e.g. show your champion in feeds, archives, and search).
          </p>
        </Section>

        <Section title="Our content">
          <p>
            The site design, branding, copy, and code outside your submissions belong to GrowthHunt.
            All rights reserved.
          </p>
        </Section>

        <Section title="Removal">
          <p>
            We may remove submissions or accounts that violate these terms or that we judge harmful
            to the community. We&rsquo;ll usually notify you, but not always (spam, urgent abuse).
          </p>
        </Section>

        <Section title="No warranty">
          <p>
            The Service is provided &ldquo;as is.&rdquo; We don&rsquo;t guarantee uptime, data
            durability, or that any submission will get traffic. Back up anything important.
          </p>
        </Section>

        <Section title="Liability">
          <p>
            To the extent permitted by law, our liability for any claim related to the Service is
            limited to the amount you&rsquo;ve paid us in the past 12 months — i.e. zero, since
            OPChampion is currently free.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these terms. Material changes will be announced via the homepage or by
            email if you&rsquo;ve given us one. Continued use after changes means you accept them.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws applicable to the operating entity. Disputes will
            be resolved through informal contact first; formal venue specified by the operating
            entity at time of dispute.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions: <a style={{ color: 'var(--accent)' }} href="mailto:hello@growthhunt.ai">hello@growthhunt.ai</a>.
            See also our <Link style={{ color: 'var(--accent)' }} href="/privacy">Privacy Policy</Link>.
          </p>
        </Section>
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
