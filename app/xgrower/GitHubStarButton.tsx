import { AnimatedCounter } from './AnimatedCounter'

/**
 * GitHub-style two-segment "Star on GitHub" button: a label segment that links
 * to the repo, plus a count segment showing the live star total. Server
 * component — embeds the AnimatedCounter client island for the rolling number.
 */
export function GitHubStarButton({ stars, url }: { stars: number; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Star X Grower on GitHub — ${stars} stars`}
      style={{
        display: 'inline-flex',
        alignItems: 'stretch',
        borderRadius: 999,
        border: '1px solid var(--rule-strong)',
        background: 'var(--bg-elev)',
        textDecoration: 'none',
        color: 'var(--ink)',
        overflow: 'hidden',
        fontWeight: 600,
        fontSize: 15,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          padding: '13px 20px',
        }}
      >
        <StarIcon />
        Star on GitHub
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '13px 18px',
          borderLeft: '1px solid var(--rule)',
          background: 'var(--bg-card)',
          fontFamily: 'var(--mono)',
          color: 'var(--accent)',
          minWidth: 56,
          justifyContent: 'center',
        }}
      >
        <AnimatedCounter to={stars} />
      </span>
    </a>
  )
}

function StarIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="var(--accent)"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.782 1.401 8.169L12 18.896l-7.335 3.857 1.401-8.169L.132 9.21l8.2-1.192z" />
    </svg>
  )
}
