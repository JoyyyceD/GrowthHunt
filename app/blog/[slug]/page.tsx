import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { getAllPosts, getAllSlugs, getPostBySlug } from '@/lib/blog'
import { getAllCompanies, getStory } from '@/lib/growth-story'
import { TopNav } from '@/lib/site/TopNav'

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
  img: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ''} style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, margin: '24px 0' }} {...props} />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div style={{ overflowX: 'auto', margin: '0 0 28px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'var(--mono)' }} {...props} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th style={{ textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid var(--rule-strong)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink)', background: 'var(--bg-card)' }} {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--rule)', color: 'var(--ink-dim)', verticalAlign: 'top' }} {...props} />
  ),
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  // Related: prefer same-module posts; fall back to most recent.
  const related = getAllPosts()
    .filter(p => p.slug !== slug)
    .sort((a, b) => {
      const sameA = a.module === post.module ? 0 : 1
      const sameB = b.module === post.module ? 0 : 1
      if (sameA !== sameB) return sameA - sameB
      return a.date < b.date ? 1 : -1
    })
    .slice(0, 3)

  // Surface a couple of growth-story case studies as cross-cuts —
  // narrative complement to the how-to blog post.
  const caseStudies = getAllCompanies()
    .map(c => getStory(c, 'en'))
    .filter((s): s is NonNullable<ReturnType<typeof getStory>> => s !== null)
    .slice(0, 2)

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

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'GrowthHunt', item: 'https://growthhunt.ai' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://growthhunt.ai/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://growthhunt.ai/blog/${slug}` },
    ],
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <TopNav variant="page" />

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
          <MDXRemote source={post.content} components={mdxComponents} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
        </div>
      </section>

      {/* Related — descriptive anchor text (post titles) gives Google
          a clear topical signal on the link target. */}
      {(related.length > 0 || caseStudies.length > 0) && (
        <section style={{ padding: '64px 0', borderTop: '1px solid var(--rule)', background: 'var(--bg-card)' }}>
          <div className="shell" style={{ maxWidth: 960 }}>
            {related.length > 0 && (
              <>
                <div className="eyebrow" style={{ marginBottom: 18 }}><span className="dot" />Keep reading</div>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 3.4vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.025em', fontWeight: 400, margin: '0 0 28px' }}>
                  More from the {post.module || 'GrowthHunt'} playbook.
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)', marginBottom: caseStudies.length > 0 ? 48 : 0 }}>
                  {related.map(r => (
                    <Link key={r.slug} href={`/blog/${r.slug}`} className="blog-card" style={{ textDecoration: 'none', display: 'block', background: 'var(--bg)' }}>
                      <article style={{ padding: '24px 28px', minHeight: 160, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {r.module && <span className="tag">{r.module}</span>}
                          <span className="tag">{r.readTime} read</span>
                        </div>
                        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.22, letterSpacing: '-0.018em', fontWeight: 400, margin: 0, flex: 1 }}>
                          {r.title}
                        </h3>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Read: {r.title.length > 38 ? `${r.title.slice(0, 36)}…` : r.title} →
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {caseStudies.length > 0 && (
              <>
                <div className="eyebrow" style={{ marginBottom: 18 }}><span className="dot" />Case studies</div>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 3.4vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.025em', fontWeight: 400, margin: '0 0 28px' }}>
                  See it run in the wild.
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
                  {caseStudies.map(s => (
                    <Link key={s.slug} href={`/growth-story/${s.slug}`} className="blog-card" style={{ textDecoration: 'none', display: 'block', background: 'var(--bg)' }}>
                      <article style={{ padding: '24px 28px', minHeight: 160, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span className="tag">Growth Story</span>
                          <span className="tag">{s.readTime}</span>
                        </div>
                        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.22, letterSpacing: '-0.018em', fontWeight: 400, margin: 0, flex: 1 }}>
                          {s.title}
                        </h3>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Read the {s.slug} story →
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

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
