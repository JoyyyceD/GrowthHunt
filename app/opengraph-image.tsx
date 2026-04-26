import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GrowthHunt — Your all-in-one go-to-market agent'
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
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 20, height: 20,
          borderRadius: '50%',
          border: '2px solid #14110d',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e84e1b' }} />
        </div>
        <span style={{ fontSize: 20, color: '#14110d', letterSpacing: '-0.02em' }}>GrowthHunt</span>
        <span style={{
          marginLeft: 16,
          fontSize: 11,
          fontFamily: 'monospace',
          color: 'rgba(20,17,13,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          background: '#f3f1ec',
          border: '1px solid rgba(20,17,13,0.1)',
          borderRadius: 999,
          padding: '4px 12px',
        }}>
          Private beta · Q3 2026
        </span>
      </div>

      {/* Headline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ fontSize: 96, lineHeight: 0.92, letterSpacing: '-0.035em', color: '#14110d', fontWeight: 400 }}>
          Your
        </div>
        <div style={{ fontSize: 96, lineHeight: 0.92, letterSpacing: '-0.035em', color: '#e84e1b', fontStyle: 'italic', fontWeight: 400 }}>
          all-in-one
        </div>
        <div style={{ fontSize: 96, lineHeight: 0.92, letterSpacing: '-0.035em', color: '#14110d', fontWeight: 400 }}>
          go-to-market
        </div>
        <div style={{ fontSize: 96, lineHeight: 0.92, letterSpacing: '-0.035em', color: '#e84e1b', fontStyle: 'italic', fontWeight: 400 }}>
          agent.
        </div>
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 18, color: 'rgba(20,17,13,0.55)', maxWidth: 560, lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>
          Find the creators your buyers already trust, write the pitch, send it, track the reply, and learn which pattern converts.
        </div>
        <div style={{ fontSize: 14, fontFamily: 'monospace', color: 'rgba(20,17,13,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          growthhunt.ai
        </div>
      </div>
    </div>,
    { ...size }
  )
}
