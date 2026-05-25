import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { findPlaybook } from '@/lib/playbooks/registry'
import { PlaybookRunner } from './PlaybookRunner'

export default async function PlaybookDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ws?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/gtm/playbooks/${id}`)
  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/gtm/playbooks')

  const pb = findPlaybook(id)
  if (!pb) notFound()

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '32px 0 64px' }}>
        <div className="shell" style={{ maxWidth: 760 }}>
          <Link href="/gtm/playbooks" style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>← All playbooks</Link>
          <div className="eyebrow" style={{ margin: '12px 0 6px' }}><span className="dot" />Playbook</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 8px' }}>{pb.name}</h1>
          <p style={{ fontSize: 14.5, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 22px' }}>{pb.description} · ~{pb.estimatedMinutes} min</p>

          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 18px', background: 'var(--bg-elev)', marginBottom: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Steps</div>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pb.steps.map((s) => (
                <li key={s.id} style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', marginRight: 6 }}>[{s.kind}]</span>
                  {s.label}
                </li>
              ))}
            </ol>
          </div>

          <PlaybookRunner workspaceId={active.id} playbookId={pb.id} needsTopic={pb.id === 'launch_post'} />
        </div>
      </section>
    </div>
  )
}
