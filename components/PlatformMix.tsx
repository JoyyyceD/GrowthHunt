import type { Platform } from '@/lib/growth-story'

const PLATFORM_ICON: Record<string, string> = {
  x: '𝕏',
  youtube: '▶',
  'hacker-news': 'Y',
  reddit: 'r/',
  linkedin: 'in',
  instagram: '◉',
}

// Per-platform "view source" CTA label for the catalyst link
const CATALYST_CTA: Record<string, string> = {
  x: 'View tweet',
  youtube: 'Watch episode',
  'hacker-news': 'Read on HN',
  reddit: 'Open r/cursor',
  linkedin: 'View source',
  instagram: 'View source',
}

interface Props {
  platforms: Platform[]
}

function ScoreDots({ score }: { score: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }} aria-label={`Score ${score} of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: i <= score ? 'var(--accent)' : 'var(--rule-strong)',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  )
}

export default function PlatformMix({ platforms }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: 1,
        background: 'var(--rule)',
        border: '1px solid var(--rule)',
      }}
    >
      {platforms.map(p => (
        <article
          key={p.slug}
          style={{
            background: 'var(--bg)',
            padding: '32px 32px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Header: name + score */}
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--rule)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--serif)',
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--ink)',
                }}
              >
                {PLATFORM_ICON[p.slug] ?? '◉'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 22,
                  letterSpacing: '-0.015em',
                  color: 'var(--ink)',
                }}
              >
                {p.name}
              </span>
            </div>
            <ScoreDots score={p.score} />
          </header>

          {/* Eyebrow: best stage */}
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
            }}
          >
            {p.bestStage}
          </div>

          {/* Role headline */}
          <h3
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              margin: 0,
              color: 'var(--ink)',
            }}
          >
            {p.role}
          </h3>

          {/* Description */}
          <p
            style={{
              fontSize: 14.5,
              lineHeight: 1.6,
              color: 'var(--ink-dim)',
              margin: 0,
            }}
          >
            {p.description}
          </p>

          {/* Catalyst block (with explicit View Source CTA below text) */}
          <div
            style={{
              borderLeft: '2px solid var(--accent)',
              paddingLeft: 14,
              marginTop: 4,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              ⚡ Catalyst moment
            </div>
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.55,
                color: 'var(--ink)',
                margin: 0,
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
              }}
            >
              {p.catalyst}
            </p>
            {p.catalystUrl && (
              <a
                href={p.catalystUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 10,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  paddingBottom: 2,
                  borderBottom: '1.5px solid var(--accent)',
                }}
                className="catalyst-cta"
              >
                {CATALYST_CTA[p.slug] ?? 'View source'} <span aria-hidden>↗</span>
              </a>
            )}
          </div>

          {/* When it works / doesn't work */}
          <div
            style={{
              paddingTop: 16,
              borderTop: '1px solid var(--rule)',
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#16a34a',
                  marginBottom: 3,
                  fontWeight: 700,
                }}
              >
                ✓ Works when
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-dim)', margin: 0 }}>
                {p.whenItWorks}
              </p>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#dc2626',
                  marginBottom: 3,
                  fontWeight: 700,
                }}
              >
                ✗ Don&apos;t expect
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-dim)', margin: 0 }}>
                {p.whenItDoesnt}
              </p>
            </div>
          </div>

          {/* Account link footer — full-width button with arrow */}
          {p.accountUrl ? (
            <a
              href={p.accountUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: 'auto',
                marginLeft: -32,
                marginRight: -32,
                padding: '18px 32px',
                borderTop: '1px solid var(--rule)',
                background: 'var(--ink)',
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--bg)',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.15s, color 0.15s',
              }}
              className="platform-account-link"
            >
              <span>{p.accountLabel ?? `Visit ${p.name}`}</span>
              <span style={{ fontSize: 14 }}>↗</span>
            </a>
          ) : (
            <div
              style={{
                marginTop: 'auto',
                marginLeft: -32,
                marginRight: -32,
                padding: '18px 32px',
                borderTop: '1px solid var(--rule)',
                background: 'var(--bg-card)',
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
                fontStyle: 'italic',
              }}
            >
              No presence — by design
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
