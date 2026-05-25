'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Step { step_id: string; status: string; summary?: string; error?: string; artifact?: { kind: string; title?: string; url?: string } }
interface RunRow {
  id: string
  workflow_id: string
  status: string
  pause_reason?: string | null
  pause_payload?: unknown
  step_log: Step[]
  artifacts: Array<{ kind: string; title?: string; url?: string }>
  outcome?: string | null
  current_step: number
  total_steps: number
}

const STATUS_COLOR: Record<string, string> = {
  succeeded: '#16a34a', awaiting_input: 'var(--warn)', running: '#3b82f6',
  failed: '#c0392b', paused: 'var(--warn)', skipped: 'var(--ink-faint)', pending: 'var(--ink-faint)',
}

export function WorkflowRunView({ run: initialRun }: { run: RunRow }) {
  const router = useRouter()
  const [run, setRun] = useState<RunRow>(initialRun)
  const [resuming, setResuming] = useState(false)

  async function resume(payload: unknown) {
    setResuming(true)
    try {
      const res = await fetch(`/api/gtm/workflows/${run.id}/resume`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_data: payload }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { toast.error(data.error || 'Resume failed'); return }
      toast.success(`Workflow ${data.status}`)
      const reload = await fetch(`/api/gtm/workflows/${run.id}`)
      const j = await reload.json()
      if (j.run) setRun(j.run as RunRow)
      router.refresh()
    } finally { setResuming(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 20px', background: 'var(--bg-elev)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#fff', background: STATUS_COLOR[run.status] || '#999', borderRadius: 4, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{run.status}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-dim)' }}>step {Math.min(run.current_step + 1, run.total_steps)} / {run.total_steps}</span>
        </div>
        {run.outcome && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink)' }}>{run.outcome}</p>}
      </div>

      {run.status === 'awaiting_input' && (
        <GatePanel run={run} resume={resume} busy={resuming} />
      )}

      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Steps</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {run.step_log.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--bg-elev)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#fff', background: STATUS_COLOR[s.status] || '#999', borderRadius: 3, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.status}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-dim)', minWidth: 110 }}>{s.step_id}</span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{s.summary || s.error || ''}</span>
              {s.artifact?.url && <a href={s.artifact.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>{s.artifact.title || s.artifact.kind} ↗</a>}
            </div>
          ))}
        </div>
      </div>

      {run.artifacts.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Artifacts</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {run.artifacts.map((a, i) => (
              <a key={i} href={a.url || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: '1px solid var(--rule)', borderRadius: 999, background: 'var(--bg)', textDecoration: 'none', color: 'var(--ink)', fontSize: 13 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{a.kind}</span>
                {a.title || a.url || a.kind}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GatePanel({ run, resume, busy }: { run: RunRow; resume: (data: unknown) => Promise<void>; busy: boolean }) {
  const reason = run.pause_reason || ''
  const payload = (run.pause_payload as Record<string, unknown>) || {}

  if (reason === 'pick_draft') {
    const candidates = (payload.candidates as Array<{ id: string; drafted_post: string; relevance: number; source_handle?: string | null }>) || []
    return (
      <div style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', borderRadius: 12, padding: '18px 22px' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Pick a draft to ship</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {candidates.map((c) => (
            <div key={c.id} style={{ padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', color: '#16a34a' }}>{c.relevance}</span>
                {c.source_handle && <span>@{c.source_handle}</span>}
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{c.drafted_post}</p>
              <button type="button" disabled={busy} onClick={() => resume({ candidate_id: c.id })} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}>Pick this →</button>
            </div>
          ))}
        </div>
        <button type="button" disabled={busy} onClick={() => resume({ candidate_id: null })} style={{ marginTop: 10, background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '8px 16px', fontSize: 13, cursor: busy ? 'not-allowed' : 'pointer' }}>Skip today</button>
      </div>
    )
  }

  if (reason === 'confirm_topic') {
    return <TopicGate seed={payload as { topic?: string; source_url?: string }} resume={resume} busy={busy} />
  }

  if (reason === 'pick_top_leads') {
    const leads = (payload.leads as Array<{ id: string; title: string; url: string; relevance: number }>) || []
    return (
      <div style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', borderRadius: 12, padding: '18px 22px' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Action these leads</div>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-dim)' }}>Acknowledge that you&apos;ve reviewed the top leads:</p>
        <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
          {leads.slice(0, 5).map((l) => (
            <li key={l.id} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink)' }}>{l.title.slice(0, 80)}</a>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', marginLeft: 6 }}>{l.relevance}</span>
            </li>
          ))}
        </ul>
        <button type="button" disabled={busy} onClick={() => resume({ acknowledged: true, count: leads.length })} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}>Acknowledged ✓</button>
      </div>
    )
  }

  if (reason === 'pick_diff') {
    const diffs = (payload.recent_diffs as Array<{ id: string; competitor_url: string; kind: string; summary: string }>) || []
    return <DiffGate diffs={diffs} resume={resume} busy={busy} />
  }

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 22px', background: 'var(--bg-elev)' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Awaiting input</div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-dim)' }}>Gate: <code>{reason}</code></p>
      <button type="button" disabled={busy} onClick={() => resume({})} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}>Continue</button>
    </div>
  )
}

function TopicGate({ seed, resume, busy }: { seed: { topic?: string; source_url?: string }; resume: (d: unknown) => Promise<void>; busy: boolean }) {
  const [topic, setTopic] = useState(seed.topic || '')
  const [sourceUrl, setSourceUrl] = useState(seed.source_url || '')
  return (
    <div style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', borderRadius: 12, padding: '18px 22px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Confirm the topic</div>
      <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What did you ship?" style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--ink)', marginBottom: 8 }} />
      <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Source URL" style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--ink)', marginBottom: 12 }} />
      <button type="button" disabled={busy || !topic.trim()} onClick={() => resume({ topic, source_url: sourceUrl })} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}>Continue →</button>
    </div>
  )
}

function DiffGate({ diffs, resume, busy }: { diffs: Array<{ id: string; competitor_url: string; kind: string; summary: string }>; resume: (d: unknown) => Promise<void>; busy: boolean }) {
  const [angle, setAngle] = useState('')
  return (
    <div style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', borderRadius: 12, padding: '18px 22px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Pick your counter angle</div>
      <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
        {diffs.slice(0, 5).map((d) => (
          <li key={d.id} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>[{d.kind}]</span> {d.summary}
          </li>
        ))}
      </ul>
      <textarea rows={3} value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="One-sentence counter-positioning angle…" style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)', marginBottom: 12, resize: 'vertical' }} />
      <button type="button" disabled={busy || !angle.trim()} onClick={() => resume({ angle })} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}>Draft counter →</button>
    </div>
  )
}
