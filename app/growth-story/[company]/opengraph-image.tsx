import { ImageResponse } from 'next/og'
import { getStory } from '@/lib/growth-story'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params
  const story = getStory(company, 'en')

  const companyName = story?.timeline.company.name ?? company
  const tagline = story?.timeline.company.tagline ?? story?.description ?? 'A growth story.'
  const seriesNum = story?.timeline.company.seriesNumber ?? ''

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
          {seriesNum ? `Growth Story #${seriesNum}` : 'Growth Story'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: companyName.length > 10 ? 72 : 88, lineHeight: 1.0, letterSpacing: '-0.035em', color: '#14110d', fontWeight: 400 }}>
          {companyName}
        </div>
        <div style={{ fontSize: tagline.length > 70 ? 22 : 28, lineHeight: 1.35, letterSpacing: '-0.015em', color: '#e84e1b', fontStyle: 'italic', maxWidth: 900 }}>
          {tagline}
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
