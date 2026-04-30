import { ImageResponse } from 'next/og'
import { getChampionWithComments } from '../_lib/fetch'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getChampionWithComments(slug)

  const name = data?.champion.name ?? 'OPChampion'
  const tagline = data?.champion.tagline ?? 'A one-person company.'
  const hue = data?.champion.hue ?? '#e84e1b'

  const initials = name
    .split(/[\s.]+/)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

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
          OPChampion
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        {/* Logo bubble */}
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: hue,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 44, color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{initials}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: name.length > 20 ? 60 : 76, lineHeight: 1.0, letterSpacing: '-0.03em', color: '#14110d', fontWeight: 400 }}>
            {name}
          </div>
          <div style={{ fontSize: tagline.length > 60 ? 22 : 28, lineHeight: 1.35, color: 'rgba(20,17,13,0.6)', fontStyle: 'italic', maxWidth: 800 }}>
            {tagline}
          </div>
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
