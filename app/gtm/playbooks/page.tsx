import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner } from '@/lib/workspace/store'
import { listPlaybooks } from '@/lib/playbooks/registry'

// Auth-gated page — prerendering it at build just trips on missing env.
export const dynamic = 'force-dynamic'

export default async function PlaybooksPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/gtm/playbooks')
  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const playbooks = listPlaybooks()

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '32px 0 64px' }}>
        <div className="shell" style={{ maxWidth: 820 }}>
          <Link href="/gtm" style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>← Mission control</Link>
          <div className="eyebrow" style={{ margin: '12px 0 8px' }}><span className="dot" />Playbooks</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
            Recipes that chain agents.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 580 }}>
            Each playbook fires several agents in sequence and persists every step as a tracked
            task. Run from here or via the chat orchestrator ("run weekly review").
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {playbooks.map((p) => (
              <Link key={p.id} href={`/gtm/playbooks/${p.id}?ws=${workspaces[0]!.id}`} style={{ display: 'block', border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 18px', background: 'var(--bg-elev)', textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', fontWeight: 400 }}>{p.name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>· ~{p.estimatedMinutes}min</span>
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-dim)', lineHeight: 1.55 }}>{p.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
