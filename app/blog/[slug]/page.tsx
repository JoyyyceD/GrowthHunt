import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllSlugs, getPostBySlug } from '@/lib/blog'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  const url = `https://growthhunt.ai/blog/${slug}`
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: post.title, description: post.description, publishedTime: post.date },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  }
}

const mdxComponents = {
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '56px 0 16px' }} {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.2, margin: '32px 0 12px' }} {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink-dim)', margin: '0 0 20px' }} {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul style={{ margin: '0 0 20px', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }} {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol style={{ margin: '0 0 20px', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }} {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-dim)' }} {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong style={{ color: 'var(--ink)', fontWeight: 600 }} {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLElement>) => (
    <blockquote style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 20, margin: '32px 0', fontFamily: 'var(--serif)', fontSize: 20, fontStyle: 'italic', color: 'var(--ink-dim)', lineHeight: 1.5 }} {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code style={{ fontFamily: 'var(--mono)', fontSize: 13, background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 4, padding: '2px 6px', color: 'var(--ink)' }} {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre style={{ fontFamily: 'var(--mono)', fontSize: 13, background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 10, padding: '20px 24px', overflow: 'auto', margin: '0 0 24px', lineHeight: 1.6 }} {...props} />
  ),
  hr: () => <hr style={{ border: 0, borderTop: '1px solid var(--rule)', margin: '48px 0' }} />,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }} {...props} />
  ),
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'GrowthHunt Labs' },
    publisher: { '@type': 'Organization', name: 'GrowthHunt', url: 'https://growthhunt.ai' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://growthhunt.ai/blog/${slug}` },
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="top">
        <div className="shell row">
          <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
            <div className="mark" />GrowthHunt
          </Link>
          <Link href="/blog" className="detail-back" style={{ marginBottom: 0 }}>← All articles</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '72px 0 56px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell" style={{ maxWidth: 800 }}>
          <Link href="/blog" className="detail-back">← Blog</Link>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {post.module && <span className="tag">{post.module}</span>}
            <span className="tag">{post.readTime} read</span>
            <span className="tag">{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 5.5vw, 72px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 24px' }}>
            {post.title}
          </h1>
          <p style={{ fontSize: 20, color: 'var(--ink-dim)', lineHeight: 1.5, margin: 0, maxWidth: 640 }}>
            {post.description}
          </p>
        </div>
      </section>

      {/* Body */}
      <section style={{ padding: '64px 0 80px' }}>
        <div className="shell" style={{ maxWidth: 720 }}>
          <MDXRemote source={post.content} components={mdxComponents} />
        </div>
      </section>

      {/* CTA */}
      <section className="closing" style={{ padding: '80px 0' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />Want this automated?</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 16px' }}>
            GrowthHunt does this <em>for you</em>.
          </h2>
          <p>Join 1,847 founders who have already reserved their seat.</p>
          <Link href="/#hero" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '12px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Join the waitlist →
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--rule)', padding: '24px 0', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/blog" className="detail-back" style={{ marginBottom: 0 }}>← All articles</Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}
