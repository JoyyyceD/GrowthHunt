import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'
import { TopNav } from '@/lib/site/TopNav'

export const metadata: Metadata = {
  title: 'Blog — GTM tactics for indie founders & growth teams',
  description: 'Practical guides on creator outreach, Reddit research, cold email, and go-to-market execution for SaaS founders.',
  alternates: { canonical: 'https://growthhunt.ai/blog' },
}

const MODULE_COLORS: Record<string, string> = {
  research: 'var(--accent)',
  discovery: '#7c4dff',
  outreach: '#0097a7',
  manage: '#388e3c',
  distribution: 'var(--warn)',
}

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <div>
      <TopNav variant="page" />

      <section style={{ padding: '80px 0 48px' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />GTM Playbook</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(48px, 6vw, 80px)', lineHeight: 0.96, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 16px' }}>
            Tactics that <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>actually</em> ship growth.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink-dim)', maxWidth: 560, lineHeight: 1.55, margin: 0 }}>
            Practical guides on creator outreach, Reddit research, cold email, and go-to-market execution — written for indie founders and growth teams.
          </p>
        </div>
      </section>

      <hr className="rule" />

      <section style={{ padding: '64px 0 120px' }}>
        <div className="shell">
          {posts.length === 0 ? (
            <p style={{ color: 'var(--ink-faint)' }}>No posts yet — check back soon.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
              {posts.map(post => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card" style={{ textDecoration: 'none', display: 'block' }}>
                  <article style={{ padding: '36px', minHeight: 240, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {post.module && (
                        <span className="tag" style={{ color: MODULE_COLORS[post.module] ?? 'var(--ink-dim)', borderColor: 'transparent', background: 'var(--bg-card)' }}>
                          {post.module}
                        </span>
                      )}
                      <span className="tag">{post.readTime} read</span>
                    </div>
                    <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, lineHeight: 1.15, letterSpacing: '-0.02em', fontWeight: 400, margin: 0, flex: 1 }}>
                      {post.title}
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.55 }}>
                      {post.description}
                    </p>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      <span style={{ color: 'var(--accent)' }}>Read →</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
