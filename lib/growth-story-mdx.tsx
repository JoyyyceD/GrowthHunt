// Shared MDX components for growth-story pages
// Used by both /growth-story/[company]/page.tsx and the [event]/page.tsx
import * as React from 'react'

export const Catalyst = ({
  children,
  label = 'The catalyst',
}: {
  children: React.ReactNode
  label?: string
}) => (
  <aside
    style={{
      borderLeft: '3px solid var(--accent)',
      background: 'var(--accent-soft)',
      padding: '26px 30px',
      margin: '40px 0',
      borderRadius: '0 8px 8px 0',
    }}
  >
    <div
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--accent)',
        fontWeight: 700,
        marginBottom: 12,
      }}
    >
      ⚡ {label}
    </div>
    <div
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 22,
        lineHeight: 1.4,
        color: 'var(--ink)',
        letterSpacing: '-0.012em',
        fontStyle: 'italic',
      }}
    >
      {children}
    </div>
  </aside>
)

export const Conclusion = ({
  children,
  title = 'Takeaway',
}: {
  children: React.ReactNode
  title?: string
}) => (
  <aside
    style={{
      border: '1px solid var(--rule-strong)',
      background: 'var(--bg-card)',
      padding: '30px 34px',
      margin: '56px 0 32px',
      borderRadius: 10,
    }}
  >
    <div
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10.5,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--ink)',
        fontWeight: 700,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--accent)',
        }}
      />
      {title}
    </div>
    <div style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--ink)' }}>{children}</div>
  </aside>
)

export const Stat = ({ value, label }: { value: string; label: string }) => (
  <span
    style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 2,
      padding: '6px 14px',
      margin: '0 4px',
      borderRadius: 8,
      background: 'var(--bg-card)',
      border: '1px solid var(--rule)',
      verticalAlign: 'middle',
    }}
  >
    <span
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 20,
        fontWeight: 500,
        color: 'var(--ink)',
        lineHeight: 1,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </span>
    <span
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--ink-faint)',
      }}
    >
      {label}
    </span>
  </span>
)

export const mdxComponents = {
  Catalyst,
  Conclusion,
  Stat,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 36,
        fontWeight: 400,
        letterSpacing: '-0.025em',
        lineHeight: 1.1,
        margin: '72px 0 22px',
      }}
      {...props}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 24,
        fontWeight: 400,
        letterSpacing: '-0.015em',
        lineHeight: 1.22,
        margin: '44px 0 14px',
      }}
      {...props}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      style={{
        fontSize: 17,
        lineHeight: 1.78,
        color: 'var(--ink-dim)',
        margin: '0 0 22px',
      }}
      {...props}
    />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul style={{ margin: '0 0 26px', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 12 }} {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol style={{ margin: '0 0 26px', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 12 }} {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li style={{ fontSize: 16.5, lineHeight: 1.7, color: 'var(--ink-dim)' }} {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong style={{ color: 'var(--ink)', fontWeight: 600 }} {...props} />
  ),
  em: (props: React.HTMLAttributes<HTMLElement>) => (
    <em style={{ fontStyle: 'italic', color: 'var(--ink)' }} {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      style={{
        borderLeft: '3px solid var(--accent)',
        paddingLeft: 28,
        margin: '40px 0',
        fontFamily: 'var(--serif)',
        fontSize: 24,
        fontStyle: 'italic',
        color: 'var(--ink)',
        lineHeight: 1.45,
        letterSpacing: '-0.01em',
      }}
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div style={{ overflowX: 'auto', margin: '0 0 28px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'var(--mono)' }} {...props} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      style={{
        textAlign: 'left',
        padding: '12px 16px',
        borderBottom: '1px solid var(--rule-strong)',
        fontWeight: 600,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--ink)',
        background: 'var(--bg-card)',
      }}
      {...props}
    />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--rule)',
        color: 'var(--ink-dim)',
      }}
      {...props}
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 13,
        background: 'var(--bg-card)',
        border: '1px solid var(--rule)',
        borderRadius: 4,
        padding: '2px 6px',
        color: 'var(--ink)',
      }}
      {...props}
    />
  ),
  hr: () => <hr style={{ border: 0, borderTop: '1px solid var(--rule)', margin: '64px 0' }} />,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }} {...props} />
  ),
}
