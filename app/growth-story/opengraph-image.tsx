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
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(20,17,13,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#f3f1ec', border: '1px solid rgba(20,17,13,0.1)', borderRadius: 999, padding: '4px 12px' }}>
          Growth Story
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 80, lineHeight: 1.0, letterSpacing: '-0.03em', color: '#14110d', fontWeight: 400 }}>
          How breakout
        </div>
        <div style={{ fontSize: 80, lineHeight: 1.0, letterSpacing: '-0.03em', color: '#e84e1b', fontWeight: 400, fontStyle: 'italic' }}>
          startups actually grew.
        </div>
        <div style={{ fontSize: 20, lineHeight: 1.5, color: 'rgba(20,17,13,0.55)', fontFamily: 'Georgia, serif', maxWidth: 800, fontStyle: 'italic', marginTop: 8 }}>
          Deep-dive timelines reconstructing funding rounds, viral moments, and GTM bets — from public sources.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e84e1b' }} />
        <span style={{ fontSize: 14, fontFamily: 'monospace', color: 'rgba(20,17,13,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          growthhunt.ai/growth-story
        </span>
      </div>
    </div>,
    { ...size }
  )
}
