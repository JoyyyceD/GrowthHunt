import { ImageResponse } from 'next/og'
import { getFeatureById } from '@/lib/features'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ feature: string }> }) {
  const { feature: id } = await params
  const feature = getFeatureById(id)

  const name = feature?.name ?? 'GrowthHunt'
  const pitch = feature?.pitch ?? 'Your all-in-one go-to-market agent.'
  const tag = feature?.tag ?? 'Soon'
  const module = feature?.module ?? ''

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
      {/* Top: brand + tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: 20, color: '#14110d', letterSpacing: '-0.02em' }}>GrowthHunt</span>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: tag === 'Live' ? '#e84e1b' : '#b07a00', textTransform: 'uppercase', letterSpacing: '0.1em', background: tag === 'Live' ? '#fbe9e2' : '#fcf5e3', border: `1px solid ${tag === 'Live' ? 'rgba(232,78,27,0.3)' : 'rgba(176,122,0,0.3)'}`, borderRadius: 999, padding: '4px 12px' }}>
          {tag === 'Live' ? '● Live' : '◌ Coming soon'}
        </span>
        {module && (
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(20,17,13,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#f3f1ec', border: '1px solid rgba(20,17,13,0.1)', borderRadius: 999, padding: '4px 12px' }}>
            {module}
          </span>
        )}
      </div>

      {/* Feature name + pitch */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 20, fontFamily: 'monospace', color: 'rgba(20,17,13,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {name}
        </div>
        <div style={{ fontSize: 72, lineHeight: 1.02, letterSpacing: '-0.025em', color: '#14110d', fontWeight: 400, maxWidth: 900 }}>
          {pitch}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ fontSize: 14, fontFamily: 'monospace', color: 'rgba(20,17,13,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        growthhunt.ai
      </div>
    </div>,
    { ...size }
  )
}
