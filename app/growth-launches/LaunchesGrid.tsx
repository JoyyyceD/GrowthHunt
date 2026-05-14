'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Launch } from '@/lib/growth-launches'

interface Props {
  launches: Launch[]
  companies: Array<{ slug: string; name: string }>
  locale: 'en' | 'zh'
}

const COPY = {
  en: {
    filterAll: 'All companies',
    type: { product: 'Product launch', media: 'Media moment', funding: 'Funding launch', acquisition: 'Acquisition' },
    typeFilters: { all: 'All types', product: 'Product launches', media: 'Media moments', funding: 'Funding launches', acquisition: 'Acquisitions' },
    readPlaybook: 'Read full playbook →',
    empty: 'No launches match those filters.',
    sortBy: 'Filters',
    byCompany: 'By company',
    byType: 'By type',
  },
  zh: {
    filterAll: '全部公司',
    type: { product: '产品发布', media: '媒体引爆', funding: '融资发布', acquisition: '并购' },
    typeFilters: { all: '全部类型', product: '产品发布', media: '媒体引爆', funding: '融资发布', acquisition: '并购' },
    readPlaybook: '看完整全程拆解 →',
    empty: '当前筛选下没有发布。',
    sortBy: '筛选',
    byCompany: '按公司',
    byType: '按类型',
  },
} as const

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string, locale: 'en' | 'zh'): string {
  const [y, m] = iso.split('-')
  if (!y) return iso
  if (locale === 'zh') return m ? `${y} 年 ${parseInt(m, 10)} 月` : y
  return m ? `${MONTHS_EN[parseInt(m, 10) - 1]} ${y}` : y
}

export default function LaunchesGrid({ launches, companies, locale }: Props) {
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const copy = COPY[locale]

  const filtered = useMemo(() => {
    return launches.filter(l => {
      if (companyFilter !== 'all' && l.company.slug !== companyFilter) return false
      if (typeFilter !== 'all' && l.type !== typeFilter) return false
      return true
    })
  }, [launches, companyFilter, typeFilter])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { product: 0, media: 0, funding: 0, acquisition: 0 }
    for (const l of launches) counts[l.type] = (counts[l.type] ?? 0) + 1
    return counts
  }, [launches])

  return (
    <div>
      {/* Type filter row */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          {copy.byType}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
            {copy.typeFilters.all} · {launches.length}
          </FilterChip>
          {(['product', 'media', 'funding', 'acquisition'] as const).map(t => (
            <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {copy.typeFilters[t]} · {typeCounts[t] ?? 0}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Company filter row */}
      <div style={{ marginBottom: 32, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 16, marginBottom: 12 }}>
          {copy.byCompany}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FilterChip active={companyFilter === 'all'} onClick={() => setCompanyFilter('all')}>
            {copy.filterAll} · {launches.length}
          </FilterChip>
          {companies.map(c => {
            const count = launches.filter(l => l.company.slug === c.slug).length
            return (
              <FilterChip key={c.slug} active={companyFilter === c.slug} onClick={() => setCompanyFilter(c.slug)}>
                {c.name} · {count}
              </FilterChip>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: 'var(--ink-faint)' }}>{copy.empty}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
          {filtered.map(l => (
            <LaunchCard key={`${l.company.slug}-${l.slug}`} launch={l} copy={copy} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

function LaunchCard({ launch: l, copy, locale }: { launch: Launch; copy: (typeof COPY)[keyof typeof COPY]; locale: 'en' | 'zh' }) {
  const href = locale === 'zh'
    ? `/growth-story/${l.company.slug}/zh#deep-dive-${l.slug}`
    : `/growth-story/${l.company.slug}#deep-dive-${l.slug}`

  return (
    <Link href={href} className="blog-card" style={{ textDecoration: 'none', display: 'block' }}>
      <article style={{ padding: 32, minHeight: 320, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--bg)' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="tag live">{l.company.name}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {formatDate(l.date, locale)}
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 8px', border: '1px solid var(--rule-strong)', borderRadius: 999 }}>
            {copy.type[l.type]}
          </span>
        </div>
        {l.gtmTag && (
          <div>
            <span style={{ display: 'inline-block', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '4px 10px' }}>
              {l.gtmTag}
            </span>
          </div>
        )}
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.01em', fontWeight: 400, margin: 0 }}>
          {l.title}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.55, flex: 1 }}>
          {l.description}
        </p>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'auto' }}>
          {copy.readPlaybook}
        </div>
      </article>
    </Link>
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
