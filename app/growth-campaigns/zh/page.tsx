import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { getAllPlaybooks, getChannelFilters } from '@/lib/growth-campaigns'
import CampaignsGrid from '../CampaignsGrid'

export const metadata: Metadata = {
  title: '出海营销组合拳：23 家 AI 黑马用了哪些渠道、怎么打的',
  description: '每家公司的 X / YouTube / Hacker News / Reddit / Instagram / TikTok 渠道组合 — 每条渠道的角色、关键引爆事件、何时奏效何时不奏效。',
  alternates: {
    canonical: 'https://growthhunt.ai/growth-campaigns/zh',
    languages: {
      'zh-CN': 'https://growthhunt.ai/growth-campaigns/zh',
      'en-US': 'https://growthhunt.ai/growth-campaigns',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/growth-campaigns/zh',
    title: '出海营销组合拳：23 家 AI 黑马的渠道打法',
    description: '每家公司用了哪些渠道、每条渠道的角色和关键引爆事件 — 一站看完。',
  },
}

export default function GrowthCampaignsZhIndex() {
  const playbooks = getAllPlaybooks('zh')
  const channelFilters = getChannelFilters('zh')
  const totalChannels = playbooks.reduce((s, p) => s + p.channels.length, 0)

  return (
    <div>
      <TopNav variant="page" />

      <section className="hero" style={{ paddingBottom: 56 }}>
        <div className="wm serif">PLAYBOOK</div>
        <div className="shell">
          <div className="grid-2">
            <div>
              <div className="eyebrow"><span className="dot" />出海组合拳</div>
              <h1>
                这些公司<em>真正用过</em>的渠道组合。
              </h1>
            </div>
            <div>
              <p className="lede">
                {playbooks.length} 家出圈 AI 公司：他们押注了哪些渠道（X、YouTube、HN、Reddit、IG、TikTok…）、每条渠道扮演什么角色、是哪一个关键事件把它点燃的。<b>一家公司一套组合拳，共 {totalChannels} 条渠道。</b>
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
                <a
                  href="#all-playbooks"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  浏览全部组合拳 →
                </a>
                <Link
                  href="/growth-story"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--rule-strong)', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  查看完整增长故事
                </Link>
              </div>
              <div className="meta" style={{ marginTop: 24 }}>
                <span style={{ color: 'var(--ink-faint)' }}>
                  {playbooks.length} 家公司 · {totalChannels} 条渠道动作 · 按渠道筛选可横向对比
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="rule" />

      <section id="all-playbooks" style={{ padding: '80px 0' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />全集</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 24px' }}>
            所有渠道组合。
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', maxWidth: 720, lineHeight: 1.55, marginBottom: 40 }}>
            按渠道筛选——看所有在 X 上做事的公司都怎么打的；或者直接看单家公司的完整组合拳。
          </p>
          <CampaignsGrid playbooks={playbooks} channelFilters={channelFilters} locale="zh" />
        </div>
      </section>

      <hr className="rule" />

      <section style={{ padding: '80px 0 120px' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />怎么读</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 48px', maxWidth: 780 }}>
            看<em>组合</em>，不是看单点。
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
            {[
              { num: '01', title: '评分 = 承重度', body: '5 个点 = 这条渠道是公司增长的承重墙；1 个点 = 试了但没用——同样是有用的情报。' },
              { num: '02', title: '关键事件 = 引信', body: '每条渠道都有一个让它真正点燃的具体事件——一条爆款推文、一档播客、一次 HN 首页、一种 Reels 模板。那才是要研究的动作。' },
              { num: '03', title: '何时奏效 / 何时无效', body: '这条渠道生效的前提，以及它失效的失败模式。用来反查你自己的产品适不适配。' },
              { num: '04', title: '为出海准备', body: '这些是西方 AI 公司真实跑过的动作。复制前先对标你自己的产品、受众、阶段。' },
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
            想看哪家公司的组合？
          </h2>
          <p>告诉我们你想拆哪家的渠道打法。</p>
          <a
            href="mailto:hi@growthhunt.ai?subject=Channel Playbook request"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', marginTop: 16 }}
          >
            邮件提请求 →
          </a>
        </div>
      </section>
    </div>
  )
}
