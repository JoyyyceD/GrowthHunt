import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { getAllLaunches, getLaunchCompanies, sortLaunchesByDate } from '@/lib/growth-launches'
import LaunchesGrid from '../LaunchesGrid'

export const metadata: Metadata = {
  title: '单次发布全程拆解：每一次出圈发布是怎么打出来的',
  description: '150+ 篇单次发布的完整拆解 —— 哪条渠道先发、文案怎么写、节奏怎么排、谁主谁辅、为什么这次能爆。Lovable v1、Cursor 2.0、Gamma AI 重启、Plaud Kickstarter…',
  alternates: {
    canonical: 'https://growthhunt.ai/growth-launches/zh',
    languages: {
      'zh-CN': 'https://growthhunt.ai/growth-launches/zh',
      'en-US': 'https://growthhunt.ai/growth-launches',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/growth-launches/zh',
    title: '单次发布全程拆解：每一次出圈发布是怎么打出来的',
    description: '150+ 次发布的完整拆解 —— 渠道顺序、创始人话术、节奏、协同。',
  },
}

export default function GrowthLaunchesZhIndex() {
  const launches = sortLaunchesByDate(getAllLaunches('zh'))
  const companies = getLaunchCompanies(launches)

  return (
    <div>
      <TopNav variant="page" />

      <section className="hero" style={{ paddingBottom: 56 }}>
        <div className="wm serif">LAUNCH</div>
        <div className="shell">
          <div className="grid-2">
            <div>
              <div className="eyebrow"><span className="dot" />单次发布全程</div>
              <h1>
                一次发布，<em>一招一招拆开看</em>。
              </h1>
            </div>
            <div>
              <p className="lede">
                {launches.length} 篇单次发布的完整拆解：哪条渠道先发、第一周创始人怎么发帖、哪一招和哪一招捆绑、为什么这个顺序能爆。<b>每一次发布——给你能复制的剧本，不是事后复盘。</b>
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
                <a
                  href="#all-launches"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  浏览全部发布 →
                </a>
                <Link
                  href="/growth-campaigns/zh"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--rule-strong)', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  看渠道组合拳
                </Link>
              </div>
              <div className="meta" style={{ marginTop: 24 }}>
                <span style={{ color: 'var(--ink-faint)' }}>
                  {launches.length} 次发布 · {companies.length} 家公司 · 按时间倒序
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="rule" />

      <section id="all-launches" style={{ padding: '80px 0' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />全集</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 24px' }}>
            所有发布。
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', maxWidth: 720, lineHeight: 1.55, marginBottom: 40 }}>
            点任意一格，看这一次发布的完整全程——渠道顺序、创始人话术、节奏、奏效原因、不能照搬之处。
          </p>
          <LaunchesGrid launches={launches} companies={companies} locale="zh" />
        </div>
      </section>

      <hr className="rule" />

      <section style={{ padding: '80px 0 120px' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />每篇里有什么</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 48px', maxWidth: 780 }}>
            是<em>剧本</em>，不是复盘。
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
            {[
              { num: '01', title: '渠道发布顺序', body: '哪条渠道先发，哪条跟进，哪条完全没参与——以及为什么这个顺序能成立。' },
              { num: '02', title: '创始人话术', body: '第 1 天公告帖、每日更新、第 4 周长帖。口吻、节奏、那种能持续滚雪球的具体格式。' },
              { num: '03', title: '里程碑捆绑', body: '融资 + ARR 一起发；产品发布 + 收购同期。哪些时刻被合并起来一并曝光。' },
              { num: '04', title: '为什么在这里奏效', body: '前置条件——受众积累、品牌契合度、产品成熟度。不是所有招都能照搬，每一篇都说清是什么让它成立。' },
            ].map(item => (
              <div key={item.num} style={{ background: 'var(--bg)', padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.num}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.2 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.55 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="closing" style={{ padding: '80px 0' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />持续更新</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 16px' }}>
            想看哪次发布被拆？
          </h2>
          <p>告诉我们你想看哪一次发布全程被拆开。</p>
          <a
            href="mailto:hi@growthhunt.ai?subject=Launch breakdown request"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', marginTop: 16 }}
          >
            邮件提请求 →
          </a>
        </div>
      </section>
    </div>
  )
}
