'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { CompanyPlaybook, ChannelPlay } from '@/lib/growth-campaigns'
import { channelKey } from '@/lib/channel-buckets'

interface Props {
  playbooks: CompanyPlaybook[]
  channelFilters: Array<{ key: string; label: string }>
  locale: 'en' | 'zh'
}

const COPY = {
  en: {
    filterAll: 'All',
    role: 'Role',
    catalyst: 'Catalyst event',
    whenWorks: 'When it works',
    whenDoesnt: 'When it doesn\'t',
    visitAccount: 'Profile ↗',
    sourceLink: 'Source ↗',
    readStory: 'Full story →',
    companies: 'companies',
    channels: 'channels',
    showAll: 'All companies',
    emptyFilter: 'No companies used that channel in our dataset.',
  },
  zh: {
    filterAll: '全部',
    role: '扮演角色',
    catalyst: '关键引爆事件',
    whenWorks: '何时奏效',
    whenDoesnt: '何时无效',
    visitAccount: '账号 ↗',
    sourceLink: '原始来源 ↗',
    readStory: '完整故事 →',
    companies: '家公司',
    channels: '条渠道',
    showAll: '全部公司',
    emptyFilter: '数据集里暂无公司用过这条渠道。',
  },
} as const

function ScoreDots({ score }: { score: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }} aria-label={`Score ${score}/5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: i <= score ? 'var(--accent)' : 'transparent',
            border: `1px solid ${i <= score ? 'var(--accent)' : 'var(--rule-strong)'}`,
          }}
        />
      ))}
    </span>
  )
}

export default function CampaignsGrid({ playbooks, channelFilters, locale }: Props) {
  const [filter, setFilter] = useState<string>('all')
  const copy = COPY[locale]

  // Count channels per filter (across all companies)
  const channelCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of playbooks) {
      for (const c of p.channels) {
        const k = channelKey(c.name)
        if (!k) continue
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
    }
    return counts
  }, [playbooks])

  // When filter active, only show companies whose channel mix includes that channel,
  // and only show the matching channel for each.
  const filteredPlaybooks = useMemo(() => {
    if (filter === 'all') return playbooks
    return playbooks
      .map(p => ({
        ...p,
        channels: p.channels.filter(c => channelKey(c.name) === filter),
      }))
      .filter(p => p.channels.length > 0)
  }, [playbooks, filter])

  const totalChannels = playbooks.reduce((sum, p) => sum + p.channels.length, 0)

  return (
    <div>
      {/* Channel filter chips */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          {locale === 'zh' ? '按渠道筛选' : 'Filter by channel'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            {copy.filterAll} · {totalChannels}
          </FilterChip>
          {channelFilters
            .map(f => ({ ...f, count: channelCounts.get(f.key) ?? 0 }))
            .filter(f => f.count > 0)
            .sort((a, b) => b.count - a.count)
            .map(f => (
              <FilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label} · {f.count}
              </FilterChip>
            ))}
        </div>
      </div>

      {/* Anchor nav for companies */}
      <div style={{ marginBottom: 32, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, marginTop: 16 }}>
          {locale === 'zh' ? '跳转到公司' : 'Jump to company'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filteredPlaybooks.map(p => (
            <a
              key={p.slug}
              href={`#playbook-${p.slug}`}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--rule-strong)',
                color: 'var(--ink-dim)',
                textDecoration: 'none',
              }}
            >
              {p.name} · {p.channels.length}
            </a>
          ))}
        </div>
      </div>

      {/* Company-grouped playbooks */}
      {filteredPlaybooks.length === 0 ? (
        <p style={{ color: 'var(--ink-faint)' }}>{copy.emptyFilter}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
          {filteredPlaybooks.map(p => (
            <section key={p.slug} id={`playbook-${p.slug}`} style={{ scrollMarginTop: 80 }}>
              {/* Company header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--rule)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400, margin: 0 }}>
                    {p.name}
                  </h3>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {p.channels.length} {copy.channels}
                  </span>
                  <Link
                    href={locale === 'zh' ? `/growth-story/${p.slug}/zh` : `/growth-story/${p.slug}`}
                    style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', marginLeft: 'auto' }}
                  >
                    {copy.readStory}
                  </Link>
                </div>
                <p style={{ fontSize: 15, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.5, maxWidth: 720 }}>
                  {p.tagline}
                </p>
              </div>

              {/* Channel cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
                {p.channels.map((c, i) => (
                  <ChannelCard key={`${p.slug}-${i}`} channel={c} copy={copy} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function ChannelCard({ channel: c, copy }: { channel: ChannelPlay; copy: (typeof COPY)[keyof typeof COPY] }) {
  return (
    <article style={{ padding: 28, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {c.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 4, lineHeight: 1.4 }}>
            {c.role}
          </div>
        </div>
        <ScoreDots score={c.score} />
      </header>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 8px', border: '1px solid var(--rule-strong)', borderRadius: 999 }}>
          {c.bestStage}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 8px', border: '1px solid var(--rule-strong)', borderRadius: 999 }}>
          {c.effort}
        </span>
      </div>

      <p style={{ fontSize: 13.5, color: 'var(--ink-dim)', lineHeight: 1.55, margin: 0 }}>
        {c.description}
      </p>

      <div style={{ borderTop: '1px dashed var(--rule)', paddingTop: 12 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          {copy.catalyst}
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
          {c.catalyst}
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {c.catalystUrl && (
            <a href={c.catalystUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {copy.sourceLink}
            </a>
          )}
          {c.accountUrl && (
            <a href={c.accountUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-dim)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {c.accountLabel ?? copy.visitAccount}
            </a>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)', marginTop: 'auto' }}>
        <div style={{ padding: '10px 12px', background: 'var(--bg)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            ✓ {copy.whenWorks}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.4 }}>
            {c.whenItWorks}
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: 'var(--bg)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            ✗ {copy.whenDoesnt}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.4 }}>
            {c.whenItDoesnt}
          </div>
        </div>
      </div>
    </article>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        fontFamily: 'var(--mono)',
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '8px 14px',
        borderRadius: 999,
        border: active ? '1px solid var(--ink)' : '1px solid var(--rule-strong)',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--bg)' : 'var(--ink-dim)',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  )
}
