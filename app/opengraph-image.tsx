import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GrowthHunt — Find software for work and creativity.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fafaf7', padding: '64px 72px', color: '#14110d', fontFamily: 'Georgia, serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', width: 24, height: 24, border: '2px solid #14110d', borderRadius: '50%', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#b83b13' }} />
        </div>
        <span style={{ fontSize: 26 }}>GrowthHunt</span>
        <span style={{ marginLeft: 'auto', fontSize: 17, fontFamily: 'sans-serif', color: '#615c55' }}>AI and software, made practical</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 84, lineHeight: 1.05, letterSpacing: '-0.03em' }}>Find software for</div>
        <div style={{ fontSize: 84, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#b83b13', fontStyle: 'italic' }}>work and creativity.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, borderTop: '1px solid #d2cec5', paddingTop: 26, fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 21, color: '#615c55' }}>Documents · Video · Meetings · AI assistants · Design</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18 }}>
          <span>For individuals, creators, and small teams.</span>
          <span style={{ color: '#615c55' }}>growthhunt.ai</span>
        </div>
      </div>
    </div>,
    size,
  )
}
