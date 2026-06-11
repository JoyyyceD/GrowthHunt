import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listWorkflows } from '@/lib/workflows/registry'
import { listWorkflowRuns } from '@/lib/workflows/runner'
import { WorkflowList } from './WorkflowList'

// Auth/data page — render per request; never prerender at build.
export const dynamic = 'force-dynamic'

export default async function WorkflowsPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/gtm/workflows')
  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/gtm')
  const wfs = listWorkflows()
  const runs = await listWorkflowRuns(active.id, 30)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '40px 0' }}>
        <div className="shell" style={{ maxWidth: 960 }}>
          <Link href="/gtm" style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>← Mission control</Link>
          <div className="eyebrow" style={{ margin: '14px 0 8px' }}><span className="dot" />Workflows · v1</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(34px, 5vw, 56px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '0 0 12px' }}>
            Workflows, not chatbots.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 32px', maxWidth: 640 }}>
            Each workflow embodies a founder ritual you already do (or wish you did). Runs have triggers,
            human-in-loop gates, and produce tracked artifacts toward a business outcome — not just a chat
            transcript. Inspired by Harvey/Sierra: ROI lives in process embedding, not generic LLM answers.
          </p>
          <WorkflowList workspaceId={active.id} workflows={wfs} runs={runs} />
        </div>
      </section>
    </div>
  )
}
