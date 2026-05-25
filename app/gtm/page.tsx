import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listRecentTasks } from '@/lib/orchestrator/tasks'
import { listConversations } from '@/lib/orchestrator/conversations'
import { listPlaybooks } from '@/lib/playbooks/registry'
import { ChatPanel } from '@/components/ChatPanel'
import { MissionControl } from './MissionControl'

const PAGE_URL = 'https://growthhunt.ai/gtm'

export const metadata: Metadata = {
  title: 'GTM Mission Control — GrowthHunt',
  description: 'One chat box that runs every GrowthHunt agent. Today\'s queue, recent runs, playbooks, and the chat box that orchestrates them all.',
  alternates: { canonical: PAGE_URL },
}

export default async function GtmPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/gtm')

  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')

  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/gtm')

  const [tasks, conversations] = await Promise.all([
    listRecentTasks({ workspaceId: active.id, limit: 12 }),
    listConversations(active.id, 8),
  ])
  const playbooks = listPlaybooks()

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '36px 0 24px' }}>
        <div className="shell">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <div className="eyebrow"><span className="dot" />GTM Mission Control</div>
            {workspaces.length > 1 && (
              <select defaultValue={active.id} onChange={(e) => { if (typeof window !== 'undefined') window.location.href = `/gtm?ws=${e.target.value}` }} style={{ marginLeft: 'auto', background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(34px, 4.6vw, 56px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '0 0 8px' }}>
            One <em>chat</em> · ten agents · every channel.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: 640 }}>
            Ask the GTM agent to run anything: audit a page, draft creator DMs, scan Reddit, start
            a launch playbook. It picks the right tool, runs it, and links you to the dedicated
            agent page if you want to go deeper.
          </p>
        </div>
      </section>

      <section style={{ padding: '0 0 72px' }}>
        <div className="shell" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 24, alignItems: 'start' }}>
          <ChatPanel workspace={active} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MissionControl workspace={active} tasks={tasks} />

            {playbooks.length > 0 && (
              <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 18px', background: 'var(--bg-elev)' }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Playbooks</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {playbooks.map((p) => (
                    <Link key={p.id} href={`/gtm/playbooks/${p.id}?ws=${active.id}`} style={{ display: 'block', padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--rule)', textDecoration: 'none' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2, lineHeight: 1.4 }}>{p.description.slice(0, 110)}{p.description.length > 110 ? '…' : ''}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {conversations.length > 0 && (
              <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 18px', background: 'var(--bg-elev)' }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Recent chats</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {conversations.map((c) => (
                    <Link key={c.id} href={`/gtm/chat/${c.id}`} style={{ padding: '6px 8px', borderRadius: 6, fontSize: 12.5, color: 'var(--ink-dim)', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0 }}>{new Date(c.last_message_at).toISOString().slice(5, 16).replace('T', ' ')}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
