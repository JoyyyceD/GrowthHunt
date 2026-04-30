import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#fafaf7',
        padding: '80px',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: 20, color: '#14110d', letterSpacing: '-0.02em' }}>GrowthHunt</span>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#e84e1b', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#fbe9e2', border: '1px solid rgba(232,78,27,0.3)', borderRadius: 999, padding: '4px 12px' }}>
          ● Weekly
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 88, lineHeight: 1.0, letterSpacing: '-0.035em', color: '#14110d', fontWeight: 400 }}>
          OPChampion
        </div>
        <div style={{ fontSize: 28, lineHeight: 1.35, letterSpacing: '-0.015em', color: '#e84e1b', fontStyle: 'italic' }}>
          One-person companies, one issue a week.
        </div>
        <div style={{ fontSize: 20, lineHeight: 1.5, color: 'rgba(20,17,13,0.55)', fontFamily: 'Georgia, serif', maxWidth: 760, fontStyle: 'italic' }}>
          Twelve indie hacker picks every Monday. Upvote, comment, follow.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e84e1b' }} />
        <span style={{ fontSize: 14, fontFamily: 'monospace', color: 'rgba(20,17,13,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          growthhunt.ai/opchampion
        </span>
      </div>
    </div>,
    { ...size }
  )
}
