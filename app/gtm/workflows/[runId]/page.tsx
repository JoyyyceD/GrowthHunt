import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkflowRun } from '@/lib/workflows/runner'
import { findWorkflow } from '@/lib/workflows/registry'
import { WorkflowRunView } from './WorkflowRunView'

export default async function WfRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/gtm/workflows/${runId}`)
  const run = await getWorkflowRun(runId)
  if (!run) notFound()
  const admin = createAdminClient()
  const { data: ws } = await admin.from('gtm_workspaces').select('owner_id, name').eq('id', run.workspace_id).maybeSingle()
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) redirect('/gtm/workflows')
  const wf = findWorkflow(run.workflow_id as string)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '36px 0' }}>
        <div className="shell" style={{ maxWidth: 880 }}>
          <Link href="/gtm/workflows" style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>← All workflows</Link>
          <div className="eyebrow" style={{ margin: '12px 0 6px' }}><span className="dot" />Workflow run</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 6px' }}>{wf?.name || run.workflow_id}</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '0 0 22px' }}>{wf?.outcome || ''}</p>
          <WorkflowRunView run={run} />
        </div>
      </section>
    </div>
  )
}
