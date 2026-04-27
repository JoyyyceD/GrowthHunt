import { ImageResponse } from 'next/og'
import { getPostBySlug } from '@/lib/blog'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  const title = post?.title ?? 'GrowthHunt Blog'
  const description = post?.description ?? 'GTM tactics for indie founders & growth teams.'
  const module = post?.module ?? ''
  const readTime = post?.readTime ?? '5 min'

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
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(20,17,13,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#f3f1ec', border: '1px solid rgba(20,17,13,0.1)', borderRadius: 999, padding: '4px 12px' }}>
          GTM Playbook
        </span>
        {module && (
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#e84e1b', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#fbe9e2', border: '1px solid rgba(232,78,27,0.3)', borderRadius: 999, padding: '4px 12px' }}>
            {module}
          </span>
        )}
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(20,17,13,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {readTime} read
        </span>
      </div>

      {/* Title + description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ fontSize: title.length > 60 ? 52 : 64, lineHeight: 1.05, letterSpacing: '-0.025em', color: '#14110d', fontWeight: 400, maxWidth: 960 }}>
          {title}
        </div>
        <div style={{ fontSize: 20, lineHeight: 1.5, color: 'rgba(20,17,13,0.55)', fontFamily: 'Georgia, serif', maxWidth: 800, fontStyle: 'italic' }}>
          {description}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e84e1b' }} />
        <span style={{ fontSize: 14, fontFamily: 'monospace', color: 'rgba(20,17,13,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          growthhunt.ai/blog
        </span>
      </div>
    </div>,
    { ...size }
  )
}
