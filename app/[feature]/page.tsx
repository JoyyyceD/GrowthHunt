import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { FEATURES, getFeatureById } from '@/lib/features'
import { MockFor } from '@/lib/mocks'
import DetailEmailForm from './DetailEmailForm'

interface Props {
  params: Promise<{ feature: string }>
}

export async function generateStaticParams() {
  return FEATURES.map(f => ({ feature: f.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { feature: id } = await params
  const feature = getFeatureById(id)
  if (!feature) return {}
  return {
    title: `${feature.name} — GrowthHunt`,
    description: feature.summary,
  }
}

export default async function FeaturePage({ params }: Props) {
  const { feature: id } = await params
  const feature = getFeatureById(id)
  if (!feature) notFound()

  const f = feature

  return (
    <div>
      {/* Nav */}
      <nav className="top">
        <div className="shell row">
          <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
            <div className="mark" />
            GrowthHunt
          </Link>
          <Link href="/" className="btn-line" style={{ fontSize: 13 }}>
            ← Back to all features
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="detail-hero">
        <div className="shell">
          <Link href={`/#${f.module}`} className="detail-back">
            ← {f.module} module
          </Link>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 0 }}>
            <span className={`tag ${f.tag === 'Live' ? 'live' : 'soon'}`}>
              {f.tag === 'Live' ? '● Live' : '◌ Coming soon'}
            </span>
            <span className="tag">{f.module}</span>
          </div>
          <h1>
            {f.pitch.split('.')[0]}<em>.</em>
          </h1>
          <p className="summary">{f.summary}</p>
        </div>
      </section>

      {/* Detail blocks */}
      <section className="shell">
        <div className="detail-block">
          <div className="label">01 · The problem</div>
          <div>
            <h3>What you&apos;re up against</h3>
            <p>{f.problem}</p>
          </div>
        </div>

        <div className="detail-block">
          <div className="label">02 · How we fix it</div>
          <div>
            <h3>What the agent does</h3>
            <p>{f.solution}</p>
          </div>
        </div>

        <div className="detail-block">
          <div className="label">03 · Example output</div>
          <div>
            <h3>What you&apos;ll see</h3>
            <p>One run, real shape:</p>
            <div className="example-box">
              <div className="head">
                <span>INPUT</span><span>→ OUTPUT</span>
              </div>
              <div className="body">
                <div><span className="k">$ </span>{f.example.input}</div>
                <div style={{ color: 'var(--ink-faint)', margin: '8px 0' }}>...</div>
                <div><span className="s">→ </span>{f.example.output}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-block">
          <div className="label">04 · Visual</div>
          <div style={{ maxWidth: 540 }}>
            <h3>The interface, sketched</h3>
            <p>The shape and feel of the surface — actual UI evolves with the beta.</p>
            <div style={{ marginTop: 24 }}>
              <MockFor feature={f} />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="detail-cta">
        <div className="shell">
          <h2>
            {f.tag === 'Live' ? 'Use it now.' : (
              <>Notify me when <em>{f.name}</em> ships.</>
            )}
          </h2>
          <p>{f.tag === 'Live' ? "This one's already shipping traffic." : 'No spam. One email when it\'s ready.'}</p>
          <DetailEmailForm featureId={f.id} featureName={f.name} isLive={f.tag === 'Live'} />
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--rule)', padding: '24px 0', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="detail-back" style={{ marginBottom: 0 }}>← All features</Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}
