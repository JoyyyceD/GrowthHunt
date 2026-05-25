'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface RunResponse {
  parent_task_id: string
  summary: string
  steps: Array<{ id: string; ok: boolean; summary?: string; error?: string }>
  error?: string
}

export function PlaybookRunner({ workspaceId, playbookId, needsTopic }: { workspaceId: string; playbookId: string; needsTopic?: boolean }) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<RunResponse | null>(null)
  const [err, setErr] = useState('')

  async function run() {
    if (needsTopic && !topic.trim()) {
      toast.error('This playbook needs a topic')
      return
    }
    setPhase('running'); setErr('')
    try {
      const res = await fetch('/api/gtm/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, playbook_id: playbookId, params: needsTopic ? { topic: topic.trim() } : {} }),
      })
      const data: RunResponse = await res.json()
      if (!res.ok) { setErr(data.error || 'Run failed'); setPhase('error'); return }
      setResult(data)
      setPhase('done')
      toast.success('Playbook finished')
    } catch (e) { setErr((e as Error).message); setPhase('error') }
  }

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 20px', background: 'var(--bg-elev)' }}>
      {needsTopic && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Topic (required)</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What are you launching?" style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
        </div>
      )}
      <button type="button" onClick={run} disabled={phase === 'running'} style={{ background: phase === 'running' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'running' ? 'not-allowed' : 'pointer' }}>
        {phase === 'running' ? 'Running…' : 'Run this playbook →'}
      </button>
      {phase === 'running' && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-dim)' }}>Synchronous — request returns when the playbook finishes (up to 5 min).</p>}
      {phase === 'error' && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c0392b' }}>{err}</p>}
      {phase === 'done' && result && (
        <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#14532d' }}>{result.summary}</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#166534' }}>
            {result.steps.map((s) => (
              <li key={s.id}>{s.ok ? '✓' : '✗'} <strong>{s.id}</strong>: {s.summary || s.error || ''}</li>
            ))}
          </ul>
          <button type="button" onClick={() => router.push(`/gtm/tasks/${result.parent_task_id}`)} style={{ marginTop: 10, background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            View full task →
          </button>
        </div>
      )}
    </div>
  )
}
