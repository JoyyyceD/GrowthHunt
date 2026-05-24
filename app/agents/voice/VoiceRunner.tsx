'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Workspace, VoiceProfile } from '@/lib/workspace/types'

type Phase = 'idle' | 'training' | 'done' | 'error'
interface RunResult { voice: VoiceProfile; sourceCount: number; notes: string }

export function VoiceRunner({ workspace, allWorkspaces }: { workspace: Workspace; allWorkspaces: Workspace[] }) {
  const router = useRouter()
  const [handle, setHandle] = useState(workspace.voice_handle || '')
  const [extras, setExtras] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<RunResult | null>(workspace.voice ? { voice: workspace.voice, sourceCount: workspace.voice.sample_passages?.length ?? 0, notes: 'Loaded from workspace.' } : null)
  const [err, setErr] = useState('')

  async function run() {
    if (!handle.trim()) return
    setPhase('training'); setErr('')
    try {
      const res = await fetch('/api/agents/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          handle: handle.trim().replace(/^@/, ''),
          extra: extras.split('\n---\n').map((s) => s.trim()).filter(Boolean).slice(0, 6),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.result) { setErr(data.error || 'Training failed.'); setPhase('error'); return }
      setResult(data.result as RunResult)
      setPhase('done')
      router.refresh()
    } catch { setErr('Network error.'); setPhase('error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {allWorkspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Workspace:</span>
          <select value={workspace.id} onChange={(e) => { window.location.href = `/agents/voice?ws=${e.target.value}` }} style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
            {allWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>X handle (without @)</label>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="growthhuntai" style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
            We&apos;ll pull up to 40 of your most recent original tweets from the Xhunter dataset. Handle must already be tracked there.
          </p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Optional long-form samples (separated by <code>---</code>)</label>
          <textarea
            rows={5}
            value={extras}
            onChange={(e) => setExtras(e.target.value)}
            placeholder={'Paste a blog intro or two here.\n---\nAnother passage…'}
            style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none', resize: 'vertical' }}
          />
        </div>
        <button type="button" onClick={run} disabled={phase === 'training'} style={{ background: phase === 'training' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'training' ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}>
          {phase === 'training' ? 'Training…' : 'Train voice profile →'}
        </button>
        {phase === 'error' && <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{err}</p>}
      </div>

      {result && (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Voice profile</div>
          <p style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--ink)', lineHeight: 1.6 }}>{result.voice.summary}</p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12, fontSize: 13, color: 'var(--ink-dim)' }}>
            {result.voice.tone && <Tag label="Tone" value={result.voice.tone} />}
            {result.voice.formatting && <Tag label="Formatting" value={result.voice.formatting} />}
            {result.voice.emoji && <Tag label="Emoji" value={result.voice.emoji} />}
            {result.voice.sentence_avg && <Tag label="Avg words" value={String(result.voice.sentence_avg)} />}
          </div>
          {(result.voice.vocabulary?.length ?? 0) > 0 && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-dim)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase' }}>Signature words: </span>
              {(result.voice.vocabulary || []).join(', ')}
            </p>
          )}
          {(result.voice.sample_passages?.length ?? 0) > 0 && (
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>Sample passages used</summary>
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(result.voice.sample_passages || []).map((s, i) => <li key={i} style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.55 }}>{s}</li>)}
              </ul>
            </details>
          )}
          <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--ink-faint)' }}>{result.notes}</p>
          <p style={{ margin: '14px 0 0', fontSize: 13 }}>
            <Link href={`/workspace/${workspace.id}`} style={{ color: 'var(--ink-dim)' }}>Open workspace →</Link>
          </p>
        </div>
      )}
    </div>
  )
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ background: 'var(--bg-card)', borderRadius: 6, padding: '4px 10px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.04em' }}>
      <span style={{ color: 'var(--ink-faint)' }}>{label.toUpperCase()} </span>
      <span style={{ color: 'var(--ink)' }}>{value}</span>
    </span>
  )
}
