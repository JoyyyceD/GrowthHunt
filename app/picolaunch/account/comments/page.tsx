import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { requireGoogleAuth } from '@/lib/picolaunch/auth-gate'

export const dynamic = 'force-dynamic'

interface CommentRow {
  id: string
  body: string
  created_at: string
  champion: { slug: string; name: string; deleted_at: string | null } | null
}

function relTime(ts: number): string {
  const diff = Math.max(1, (Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)}d ago`
  return new Date(ts).toLocaleDateString()
}

export default async function MyCommentsPage() {
  const user = await requireGoogleAuth('/picolaunch/account/comments')
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('comments')
    .select('id, body, created_at, champion:champions!champion_id(slug, name, deleted_at)')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) console.error('[account/comments]', error)

  const comments = ((data ?? []) as unknown as CommentRow[]).filter(
    c => c.champion && c.champion.deleted_at == null,
  )

  if (comments.length === 0) {
    return (
      <div
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          background: 'var(--bg-elev)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
        }}
      >
        <p
          className="serif"
          style={{ fontSize: 28, fontStyle: 'italic', margin: '0 0 8px', fontWeight: 400 }}
        >
          No comments yet.
        </p>
        <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 24px' }}>
          Join the discussion on any launch.
        </p>
        <Link
          href="/picolaunch"
          style={{
            display: 'inline-flex',
            background: 'var(--ink)',
            color: 'var(--bg)',
            padding: '12px 22px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Browse launches →
        </Link>
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 16,
        }}
      >
        {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments.map(c => (
          <li
            key={c.id}
            style={{
              padding: '16px 20px',
              background: 'var(--bg-elev)',
              border: '1px solid var(--rule)',
              borderRadius: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
                marginBottom: 8,
                flexWrap: 'wrap',
              }}
            >
              <Link
                href={`/picolaunch/${c.champion!.slug}`}
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  textDecoration: 'none',
                }}
              >
                {c.champion!.name} →
              </Link>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink-faint)',
                }}
              >
                {relTime(Date.parse(c.created_at))}
              </span>
            </div>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--ink-dim)',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {c.body}
            </p>
          </li>
        ))}
      </ul>
    </>
  )
}
