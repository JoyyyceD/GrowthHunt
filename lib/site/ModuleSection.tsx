'use client'

import Link from 'next/link'
import type { Feature, ModuleDef } from '@/lib/features'
import { MockFor } from '@/lib/mocks'

function FeatureBlock({
  feature, flip, voted, baseVotes, onVote,
}: {
  feature: Feature
  flip: boolean
  voted: boolean
  baseVotes: number
  onVote: () => void
}) {
  const f = feature
  return (
    <div className={`feature ${flip ? 'flip' : ''}`}>
      <div className="copy">
        <div className="row-tags">
          <span className={`tag ${f.tag === 'Live' ? 'live' : 'soon'}`}>
            {f.tag === 'Live' ? '● Live' : '◌ Coming soon'}
          </span>
          <span className="tag">{f.module}</span>
        </div>
        <div className="eyebrow" style={{ marginBottom: 0 }}>{f.name}</div>
        <h3>{f.pitch}</h3>
        <p>{f.summary}</p>
        <div className="actions">
          <Link href={`/${f.id}`} className="btn-line">
            Read more <span className="arrow">→</span>
          </Link>
          <button className={`btn-vote ${voted ? 'voted' : ''}`} onClick={onVote}>
            <span className="heart">{voted ? '♥' : '♡'}</span>
            <span>Interested</span>
            <span className="count">{voted ? baseVotes + 1 : baseVotes}</span>
          </button>
        </div>
      </div>
      <div className="visual">
        <MockFor feature={f} />
      </div>
    </div>
  )
}

export function ModuleSection({
  mod, features, votes, baseVotesMap, onVote,
}: {
  mod: ModuleDef
  features: Feature[]
  votes: Record<string, boolean>
  baseVotesMap: Record<string, number>
  onVote: (id: string) => void
}) {
  return (
    <section id={mod.id}>
      <div className="shell">
        <div className="section-head">
          <div className="num serif">{mod.num}</div>
          <h2>{mod.title} — <em>{mod.sub}</em></h2>
        </div>
        {features.map((f, i) => (
          <FeatureBlock
            key={f.id}
            feature={f}
            flip={i % 2 === 1}
            voted={!!votes[f.id]}
            baseVotes={baseVotesMap[f.id] ?? 12}
            onVote={() => onVote(f.id)}
          />
        ))}
      </div>
    </section>
  )
}
