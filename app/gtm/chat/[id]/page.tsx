import { notFound, redirect } from 'next/navigation'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { getConversation, listMessages } from '@/lib/orchestrator/conversations'
import { ChatPanel } from '@/components/ChatPanel'

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/gtm/chat/${id}`)
  const conv = await getConversation(id)
  if (!conv) notFound()
  const ws = await getWorkspace(conv.workspace_id)
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) redirect('/gtm')
  const messages = await listMessages(id, 200)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '32px 0 64px' }}>
        <div className="shell" style={{ maxWidth: 820 }}>
          <div className="eyebrow"><span className="dot" />GTM Chat</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em', margin: '8px 0 16px' }}>{conv.title}</h1>
          <ChatPanel workspace={ws} initialConversation={conv} initialMessages={messages} />
        </div>
      </section>
    </div>
  )
}
