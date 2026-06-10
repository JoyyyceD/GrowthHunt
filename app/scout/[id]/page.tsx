'use client'
/**
 * /scout/[id] — the workspace. Replays a live onboarding task from
 * scout_tasks if one is running (reconnect case), otherwise the return-visit
 * state: greeting + suggestion chips (decision 3.7 state ④).
 */
import { use, useEffect, useRef, useState } from 'react'
import {
  ChatColumn, LeftRail, RightRail, reduceBlocks,
  useWorkspaceData, type Block, type ScoutEvent,
} from '../ui'

export default function ScoutWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = use(params)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [busy, setBusy] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [wsName, setWsName] = useState('')
  const [pendingAsk, setPendingAsk] = useState<string | null>(null)
  const { artifacts, queue, refresh } = useWorkspaceData(workspaceId)
  const bootstrapped = useRef(false)

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    void (async () => {
      const res = await fetch(`/api/scout/tasks?ws=${workspaceId}`)
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(`/scout/${workspaceId}`)}`
        return
      }
      const data = res.ok ? await res.json() : {}
      setWsName(data.workspaceName || '')
      const task = data.task
      if (task?.progress?.length) {
        // replay persisted milestones (status lines, artifact_done, final reply)
        let replayed: Block[] = []
        for (const event of task.progress as ScoutEvent[]) replayed = reduceBlocks(replayed, event)
        setBlocks(replayed)
        if (['scraping', 'researching', 'synthesizing', 'drafting'].includes(task.status)) {
          // pipeline still running server-side — poll until terminal
          const poll = setInterval(async () => {
            const r = await fetch(`/api/scout/tasks/${task.id}?ws=${workspaceId}`)
            if (!r.ok) return
            const t = (await r.json()).task
            let rb: Block[] = []
            for (const event of (t.progress || []) as ScoutEvent[]) rb = reduceBlocks(rb, event)
            setBlocks(rb)
            if (!['scraping', 'researching', 'synthesizing', 'drafting'].includes(t.status)) {
              clearInterval(poll)
              void refresh()
            }
          }, 3000)
        }
      } else {
        setBlocks([{
          kind: 'scout',
          text: "Welcome back. 🐾 I've got your knowledge base loaded — ask me anything, or pick a quick start below.",
        }])
      }
      // hand-off from the Files page edit bar (?ask=…)
      const ask = new URLSearchParams(window.location.search).get('ask')
      if (ask) {
        window.history.replaceState(null, '', `/scout/${workspaceId}`)
        setPendingAsk(ask)
      }
    })()
  }, [workspaceId, refresh])

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <LeftRail workspaceId={workspaceId} workspaceName={wsName} active="chat" />
      <ChatColumn
        workspaceId={workspaceId}
        blocks={blocks}
        setBlocks={setBlocks}
        busy={busy}
        setBusy={setBusy}
        conversationId={conversationId}
        setConversationId={setConversationId}
        autoSend={pendingAsk}
        onAutoSent={() => setPendingAsk(null)}
        suggestions={busy ? undefined : ['What should I post today?', 'Draft 3 posts about our latest feature', 'How do I stack up against competitors?']}
      />
      <RightRail
        workspaceId={workspaceId}
        artifacts={artifacts}
        queue={queue}
        refreshQueue={refresh}
        collapsed={railCollapsed}
        setCollapsed={setRailCollapsed}
      />
    </div>
  )
}
