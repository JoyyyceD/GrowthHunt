import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { WorkspaceEditor } from './WorkspaceEditor'

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/workspace/${id}`)
  const ws = await getWorkspace(id)
  if (!ws) notFound()
  if (ws.owner_id && ws.owner_id !== user.id) redirect('/workspace')

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell">
          <Link href="/workspace" style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>
            ← All workspaces
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '14px 0 8px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: ws.brand_color || 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
              {ws.emoji || ws.name[0]?.toUpperCase() || 'G'}
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', margin: 0 }}>
                {ws.name}
              </h1>
              <a href={ws.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none', fontFamily: 'var(--mono)' }}>
                {ws.url.replace(/^https?:\/\//, '')} ↗
              </a>
            </div>
          </div>
          <WorkspaceEditor initial={ws} />
        </div>
      </section>
    </div>
  )
}
