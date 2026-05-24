import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listEmailDrafts } from '@/lib/agents/cold-email'
import { ColdEmailRunner } from './ColdEmailRunner'

export const metadata: Metadata = {
  title: 'Cold Email Outbound — GrowthHunt',
  description: 'Paste a B2B target list, agent drafts personalized emails in your voice, send via Brevo. Indie volume only — no warming/sequencing.',
}

export default async function ColdEmailPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/cold-email')

  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/workspace')

  const drafts = await listEmailDrafts(active.id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 960 }}>
          <div className="eyebrow"><span className="dot" />Cold Email · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            B2B outreach, <em>your voice</em>, real send.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
            Paste a target list (name, email, company, role, optional note). Agent drafts a
            personalized email per row in your voice, you review, click <strong>Send</strong> →
            real send through Brevo. Indie volume only (50/day cap) — for cold-email-at-scale you
            still want a dedicated warming setup. Same drafts model as Creator Outreach.
          </p>
          <ColdEmailRunner workspace={active} allWorkspaces={workspaces} initialDrafts={drafts} />
        </div>
      </section>
    </div>
  )
}
