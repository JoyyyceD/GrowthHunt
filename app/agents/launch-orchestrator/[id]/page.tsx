import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaign } from '@/lib/agents/launch-orchestrator'
import { CampaignWorkspace } from './CampaignWorkspace'

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/agents/launch-orchestrator/${id}`)
  const campaign = await getCampaign(id)
  if (!campaign) notFound()
  const admin = createAdminClient()
  const { data: ws } = await admin.from('gtm_workspaces').select('owner_id, name').eq('id', campaign.workspace_id).maybeSingle()
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) redirect('/agents/launch-orchestrator')

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '36px 0' }}>
        <div className="shell" style={{ maxWidth: 940 }}>
          <Link href="/agents/launch-orchestrator" style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>← All campaigns</Link>
          <div className="eyebrow" style={{ margin: '12px 0 6px' }}><span className="dot" />Launch Campaign</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 6px' }}>{campaign.name}</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 22px' }}>
            Launches <strong>{new Date(campaign.launch_at).toLocaleString()}</strong>{campaign.tagline ? ` · ${campaign.tagline}` : ''}
          </p>
          <CampaignWorkspace campaign={campaign} />
        </div>
      </section>
    </div>
  )
}
