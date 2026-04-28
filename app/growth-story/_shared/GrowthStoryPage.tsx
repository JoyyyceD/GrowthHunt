import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import {
  getStory,
  getEventArticle,
  type EventArticle,
} from '@/lib/growth-story'
import { mdxComponents } from '@/lib/growth-story-mdx'
import CaseStudyTimeline from '@/components/CaseStudyTimeline'
import PlatformMix from '@/components/PlatformMix'
import { TopNav } from '@/lib/site/TopNav'
import { GatedContent } from '@/lib/site/GatedContent'

type Locale = 'en' | 'zh'

const TYPE_COLOR: Record<string, string> = {
  product: '#2563eb',
  funding: '#16a34a',
  media: '#dc2626',
  acquisition: '#9333ea',
}

const UI = {
  en: {
    growthStoryLabel: (n: string) => `Growth Story · No. ${n}`,
    tags: {
      read: 'read',
      founded: 'Founded',
      eventsTracked: 'events tracked',
      deepDives: 'deep dives',
    },
    sections: {
      timeline: {
        eyebrow: 'Timeline',
        title: 'ARR, valuation, and every GTM move, ',
        titleAccent: 'on one timeline.',
        lede: 'Events split into four horizontal bands by type. Markers with a halo jump to a deep-dive section below. Hover anything for a summary; click external markers to jump to the original source.',
      },
      platformMix: {
        eyebrow: 'Platform Mix',
        title: 'Which channels mattered ',
        titleAccent: 'when.',
        lede: (name: string, count: number) =>
          `${name} used ${count} platform${count !== 1 ? 's' : ''} differently. Some carried the entire arc; others were episodic catalysts.`,
      },
      synthesis: {
        eyebrow: 'Synthesis',
        title: 'The full ',
        titleAccent: 'thesis.',
        lede: 'The big-picture read on what actually drove the curve — before zooming in on each key moment.',
      },
      deepDives: (count: number) => ({
        eyebrow: 'Deep Dives',
        title: `${count} key moments, `,
        titleAccent: 'fully unpacked.',
        lede: 'For each: the catalyst, the concrete numbers, why it landed, and the reusable pattern underneath. Read straight through, or jump to any one.',
      }),
    },
    typeLabel: {
      product: 'Product',
      funding: 'Funding',
      media: 'Media',
      acquisition: 'M&A',
    },
    nav: {
      prev: '← Previous',
      next: 'Next →',
      backToTop: '↑ Back to top',
      originalSource: 'Original source ↗',
      backToGrowthHunt: '← GrowthHunt',
      copyright: '© 2026 GrowthHunt Labs',
    },
  },
  zh: {
    growthStoryLabel: (n: string) => `增长故事 · 第 ${n} 期`,
    tags: {
      read: '阅读',
      founded: '成立于',
      eventsTracked: '个事件',
      deepDives: '篇深度拆解',
    },
    sections: {
      timeline: {
        eyebrow: '时间线',
        title: 'ARR、估值与每一个 GTM 动作，',
        titleAccent: '汇集在一条时间线上。',
        lede: '事件按类型分为四个水平轨道。带光晕的标记点击后跳转至下方对应的深度拆解。悬停查看摘要；点击外链标记跳转至原始来源。',
      },
      platformMix: {
        eyebrow: '平台组合',
        title: '哪些渠道，',
        titleAccent: '在哪个阶段真正起作用。',
        lede: (name: string, count: number) =>
          `${name} 对 ${count} 个平台的用法各不相同。有些贯穿始终，有些是阶段性催化剂。`,
      },
      synthesis: {
        eyebrow: '综合分析',
        title: '完整的',
        titleAccent: '核心论点。',
        lede: '关于增长曲线真正驱动因素的宏观解读——在逐一拆解每个关键节点之前，先建立整体认知框架。',
      },
      deepDives: (count: number) => ({
        eyebrow: '深度拆解',
        title: `${count} 个关键节点，`,
        titleAccent: '全面拆解。',
        lede: '每个节点包含：催化剂、具体数据、为什么奏效，以及可复用的底层模式。可连续通读，也可直接跳到任意一篇。',
      }),
    },
    typeLabel: {
      product: '产品',
      funding: '融资',
      media: '媒体',
      acquisition: '收购',
    },
    nav: {
      prev: '← 上一篇',
      next: '下一篇 →',
      backToTop: '↑ 回到顶部',
      originalSource: '原始来源 ↗',
      backToGrowthHunt: '← GrowthHunt',
      copyright: '© 2026 GrowthHunt Labs',
    },
  },
} as const
// (Shape parity between locales is enforced informally — the original
// `satisfies Record<Locale, typeof UI['en']>` clause was a self-referential
// type, which TS now flags as a circular initializer.)

interface Props {
  company: string
  locale: Locale
}

export default async function GrowthStoryPage({ company, locale }: Props) {
  const story = getStory(company, locale)
  if (!story) return null

  const { timeline } = story
  const t = UI[locale]

  const deepDives: EventArticle[] = timeline.events
    .filter(e => e.articleSlug)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(e => getEventArticle(company, e.articleSlug!, locale))
    .filter((a): a is EventArticle => a !== null)

  const SectionHead = ({
    num,
    eyebrow,
    title,
    titleAccent,
    lede,
  }: {
    num: string
    eyebrow: string
    title: React.ReactNode
    titleAccent?: string
    lede?: React.ReactNode
  }) => (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginBottom: 18, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 56, lineHeight: 1, color: 'var(--ink-faint)', letterSpacing: '-0.02em' }}>
          {num}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink-faint)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
          {eyebrow}
        </span>
      </div>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 4.6vw, 56px)', fontWeight: 400, letterSpacing: '-0.028em', lineHeight: 1.02, margin: '0 0 18px', maxWidth: 920 }}>
        {title}
        {titleAccent && <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{titleAccent}</em>}
      </h2>
      {lede && (
        <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 680, lineHeight: 1.6, margin: 0 }}>
          {lede}
        </p>
      )}
    </div>
  )

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description: story.description,
    datePublished: story.date,
    author: { '@type': 'Organization', name: 'GrowthHunt Labs' },
    publisher: { '@type': 'Organization', name: 'GrowthHunt', url: 'https://growthhunt.ai' },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': locale === 'zh'
        ? `https://growthhunt.ai/growth-story/${company}`
        : `https://growthhunt.ai/growth-story/${company}/en`,
    },
    isAccessibleForFree: false,
    hasPart: [{ '@type': 'WebPageElement', isAccessibleForFree: false, cssSelector: '.gh-paywall' }],
    ...(locale === 'zh'
      ? { inLanguage: 'zh-CN' }
      : { inLanguage: 'en-US' }),
  }

  const seriesNum = String(timeline.company.seriesNumber ?? 1).padStart(2, '0')

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <TopNav variant="page" />

      {/* Hero */}
      <section style={{ padding: '96px 0 72px', borderBottom: '1px solid var(--rule)', position: 'relative', overflow: 'hidden' }}>
        <div className="shell" style={{ position: 'relative', zIndex: 2 }}>
          <div className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <span className="dot" />
            {t.growthStoryLabel(seriesNum)}
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(60px, 9vw, 132px)', lineHeight: 0.92, letterSpacing: '-0.038em', fontWeight: 400, margin: '0 0 28px', maxWidth: 1100 }}>
            {timeline.company.name}{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--ink-faint)', fontSize: '0.55em' }}>
              / {timeline.company.legalName}
            </em>
          </h1>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(24px, 2.6vw, 32px)', fontStyle: 'italic', maxWidth: 880, color: 'var(--ink)', lineHeight: 1.32, margin: '0 0 36px', letterSpacing: '-0.015em' }}>
            {timeline.company.tagline}
          </p>
          <p style={{ fontSize: 17.5, color: 'var(--ink-dim)', maxWidth: 720, lineHeight: 1.65, margin: '0 0 34px' }}>
            {timeline.company.summary}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="tag">{story.readTime} {t.tags.read}</span>
            <span className="tag">{t.tags.founded} {timeline.company.founded}</span>
            <span className="tag">{timeline.events.length} {t.tags.eventsTracked}</span>
            <span className="tag">{deepDives.length} {t.tags.deepDives}</span>
          </div>
        </div>
      </section>

      {/* 01 — Timeline */}
      <section style={{ padding: '88px 0 64px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell">
          <SectionHead
            num="01"
            eyebrow={t.sections.timeline.eyebrow}
            title={t.sections.timeline.title}
            titleAccent={t.sections.timeline.titleAccent}
            lede={t.sections.timeline.lede}
          />
          <CaseStudyTimeline timeline={timeline} company={company} />
        </div>
      </section>

      {/* 02 — Platform Mix */}
      {timeline.platforms && timeline.platforms.length > 0 && (
        <section style={{ padding: '88px 0 64px', borderBottom: '1px solid var(--rule)' }}>
          <div className="shell">
            <SectionHead
              num="02"
              eyebrow={t.sections.platformMix.eyebrow}
              title={t.sections.platformMix.title}
              titleAccent={t.sections.platformMix.titleAccent}
              lede={t.sections.platformMix.lede(timeline.company.name, timeline.platforms?.length ?? 0)}
            />
            <PlatformMix platforms={timeline.platforms} />
          </div>
        </section>
      )}

      {/* Gate: sections 03 and 04 */}
      <GatedContent>
        {/* 03 — Synthesis */}
        <section style={{ padding: '88px 0 64px', borderBottom: '1px solid var(--rule)' }}>
          <div className="shell">
            <SectionHead
              num="03"
              eyebrow={t.sections.synthesis.eyebrow}
              title={t.sections.synthesis.title}
              titleAccent={t.sections.synthesis.titleAccent}
              lede={t.sections.synthesis.lede}
            />
            <div style={{ marginTop: 8 }} className="growth-prose">
              <MDXRemote source={story.content} components={mdxComponents} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
            </div>
          </div>
        </section>

        {/* 04 — Deep Dives */}
        {deepDives.length > 0 && (() => {
          const dd = t.sections.deepDives(deepDives.length)
          return (
            <section style={{ padding: '88px 0 0' }}>
              <div className="shell">
                <SectionHead
                  num="04"
                  eyebrow={dd.eyebrow}
                  title={dd.title}
                  titleAccent={dd.titleAccent}
                  lede={dd.lede}
                />
                {/* Jump-to nav */}
                <nav
                  aria-label={locale === 'zh' ? '深度拆解导航' : 'Deep dive navigation'}
                  style={{ margin: '8px 0 0', paddingTop: 24, paddingBottom: 24, borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 4 }}
                >
                  {deepDives.map((a, idx) => (
                    <a
                      key={a.slug}
                      href={`#deep-dive-${a.slug}`}
                      style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', textDecoration: 'none', borderRadius: 6, transition: 'background 0.15s', color: 'var(--ink)' }}
                      className="blog-card"
                    >
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: TYPE_COLOR[a.type], fontWeight: 600 }}>
                        {String(idx + 1).padStart(2, '0')} · {a.date}
                      </span>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.25, fontWeight: 400, letterSpacing: '-0.012em', color: 'var(--ink)' }}>
                        {a.eventTitle}
                      </span>
                    </a>
                  ))}
                </nav>
              </div>

              {/* Inline deep-dive articles */}
              {deepDives.map((a, idx) => (
                <article
                  key={a.slug}
                  id={`deep-dive-${a.slug}`}
                  style={{ padding: '88px 0 88px', borderBottom: idx === deepDives.length - 1 ? '1px solid var(--rule)' : 'none', scrollMarginTop: 88 }}
                >
                  <div className="shell">
                    <div style={{ marginBottom: 36 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 44, lineHeight: 1, color: 'var(--ink-faint)', letterSpacing: '-0.02em' }}>
                          04 / {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-faint)' }}>
                          {a.date}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                        <span className="tag" style={{ color: TYPE_COLOR[a.type], borderColor: 'transparent', background: 'var(--bg-card)' }}>
                          {t.typeLabel[a.type as keyof typeof t.typeLabel]}
                        </span>
                        {a.gtmTag && <span className="tag">{a.gtmTag}</span>}
                      </div>
                      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(34px, 4.4vw, 52px)', lineHeight: 1.02, letterSpacing: '-0.028em', fontWeight: 400, margin: '0 0 22px' }}>
                        {a.title}
                      </h2>
                      <p style={{ fontSize: 19, color: 'var(--ink-dim)', lineHeight: 1.5, margin: 0, maxWidth: 720, fontFamily: 'var(--serif)', fontStyle: 'italic', letterSpacing: '-0.005em' }}>
                        {a.description}
                      </p>
                      {a.externalUrl && (
                        <a
                          href={a.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 28, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', padding: '8px 16px', border: '1px solid var(--accent-border)', borderRadius: 999, background: 'var(--accent-soft)', fontWeight: 600 }}
                        >
                          {t.nav.originalSource}
                        </a>
                      )}
                    </div>

                    <div className="growth-prose">
                      <MDXRemote source={a.content} components={mdxComponents} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
                    </div>

                    {/* Prev / Next nav */}
                    <div style={{ marginTop: 56, paddingTop: 24, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      {idx > 0 ? (
                        <a href={`#deep-dive-${deepDives[idx - 1].slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '46%' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-faint)' }}>
                            {t.nav.prev}
                          </span>
                          <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.012em' }}>
                            {deepDives[idx - 1].eventTitle}
                          </span>
                        </a>
                      ) : <span />}
                      {idx < deepDives.length - 1 ? (
                        <a href={`#deep-dive-${deepDives[idx + 1].slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right', maxWidth: '46%' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-faint)' }}>
                            {t.nav.next}
                          </span>
                          <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.012em' }}>
                            {deepDives[idx + 1].eventTitle}
                          </span>
                        </a>
                      ) : (
                        <a href="#top" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-faint)' }}>
                            {t.nav.backToTop}
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )
        })()}
      </GatedContent>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--rule)', padding: '32px 0', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="detail-back" style={{ marginBottom: 0 }}>
            {t.nav.backToGrowthHunt}
          </Link>
          <span className="eyebrow">{t.nav.copyright}</span>
        </div>
      </footer>
    </div>
  )
}
