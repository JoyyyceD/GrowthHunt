'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Workspace, IcpSegment } from '@/lib/workspace/types'

type Saving = 'idle' | 'saving' | 'saved' | 'error'

function useDebouncedSave(id: string) {
  const [saving, setSaving] = useState<Saving>('idle')
  async function save(patch: Record<string, unknown>) {
    setSaving('saving')
    try {
      const res = await fetch(`/api/workspace/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) { setSaving('error'); return }
      setSaving('saved')
      setTimeout(() => setSaving('idle'), 1500)
    } catch {
      setSaving('error')
    }
  }
  return { saving, save }
}

const sectionStyle: React.CSSProperties = {
  border: '1px solid var(--rule)',
  borderRadius: 12,
  padding: '22px 24px',
  background: 'var(--bg-elev)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--ink-faint)',
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg)',
  border: '1.5px solid var(--rule-strong)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  fontFamily: 'inherit',
  color: 'var(--ink)',
  outline: 'none',
}

export function WorkspaceEditor({ initial }: { initial: Workspace }) {
  const [ws, setWs] = useState<Workspace>(initial)
  const { saving, save } = useDebouncedSave(initial.id)

  function patch(p: Partial<Workspace>) {
    setWs((cur) => ({ ...cur, ...p }))
    save(p as Record<string, unknown>)
  }

  function updateSegment(i: number, partial: Partial<IcpSegment>) {
    const next = [...ws.icp_segments]
    next[i] = { ...next[i]!, ...partial }
    patch({ icp_segments: next })
  }
  function removeSegment(i: number) {
    patch({ icp_segments: ws.icp_segments.filter((_, idx) => idx !== i) })
  }
  function addSegment() {
    patch({ icp_segments: [...ws.icp_segments, { name: '', pains: [], channels: [] }] })
  }

  function updateKeyMessage(i: number, v: string) {
    const next = [...ws.key_messages]; next[i] = v
    patch({ key_messages: next })
  }
  function removeKeyMessage(i: number) {
    patch({ key_messages: ws.key_messages.filter((_, idx) => idx !== i) })
  }
  function addKeyMessage() {
    patch({ key_messages: [...ws.key_messages, ''] })
  }

  function updateCompetitor(i: number, partial: { name?: string; url?: string }) {
    const next = [...ws.competitors]
    next[i] = { ...next[i]!, ...partial }
    patch({ competitors: next })
  }
  function removeCompetitor(i: number) {
    patch({ competitors: ws.competitors.filter((_, idx) => idx !== i) })
  }
  function addCompetitor() {
    patch({ competitors: [...ws.competitors, { name: '' }] })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)' }}>
          Edits autosave. Connected agents read this workspace immediately.
        </p>
        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: saving === 'saved' ? '#16a34a' : saving === 'error' ? '#c0392b' : 'var(--ink-faint)' }}>
          {saving === 'saving' && 'Saving…'}
          {saving === 'saved' && '✓ Saved'}
          {saving === 'error' && 'Save failed'}
        </span>
      </div>

      {/* Identity */}
      <div style={sectionStyle}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>Identity</h2>
        <div>
          <label style={labelStyle}>One-liner</label>
          <input
            value={ws.one_liner || ''}
            onChange={(e) => setWs((c) => ({ ...c, one_liner: e.target.value }))}
            onBlur={() => save({ one_liner: ws.one_liner })}
            placeholder="The all-in-one go-to-market agent for indie founders"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Positioning */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>Positioning</h2>
          <Link href={`/agents/icp?ws=${ws.id}`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
            Run ICP Agent →
          </Link>
        </div>
        <div>
          <label style={labelStyle}>Positioning statement</label>
          <textarea
            rows={3}
            value={ws.positioning || ''}
            onChange={(e) => setWs((c) => ({ ...c, positioning: e.target.value }))}
            onBlur={() => save({ positioning: ws.positioning })}
            placeholder="For [audience], [product] is the [category] that [unique value]. Unlike [alternatives], we [differentiator]."
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Key messages</label>
          {ws.key_messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input value={m} onChange={(e) => updateKeyMessage(i, e.target.value)} placeholder="One core message you want to land" style={inputStyle} />
              <button type="button" onClick={() => removeKeyMessage(i)} style={{ background: 'transparent', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '0 14px', cursor: 'pointer', color: 'var(--ink-dim)' }}>×</button>
            </div>
          ))}
          <button type="button" onClick={addKeyMessage} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px dashed var(--rule-strong)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>+ Add message</button>
        </div>
      </div>

      {/* ICP */}
      <div style={sectionStyle}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>ICP — who you sell to</h2>
        <div>
          <label style={labelStyle}>ICP summary</label>
          <textarea
            rows={2}
            value={ws.icp_summary || ''}
            onChange={(e) => setWs((c) => ({ ...c, icp_summary: e.target.value }))}
            onBlur={() => save({ icp_summary: ws.icp_summary })}
            placeholder="Indie founders going 0→1,000 customers, lean growth teams, …"
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>
        {ws.icp_segments.map((seg, i) => (
          <div key={i} style={{ border: '1px dashed var(--rule-strong)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={seg.name} onChange={(e) => updateSegment(i, { name: e.target.value })} placeholder="Segment name" style={inputStyle} />
              <button type="button" onClick={() => removeSegment(i)} style={{ background: 'transparent', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '0 14px', cursor: 'pointer', color: 'var(--ink-dim)' }}>×</button>
            </div>
            <input value={seg.jtbd || ''} onChange={(e) => updateSegment(i, { jtbd: e.target.value })} placeholder="Jobs to be done — what they hire your product to do" style={inputStyle} />
            <input value={(seg.pains || []).join('; ')} onChange={(e) => updateSegment(i, { pains: e.target.value.split(';').map((s) => s.trim()).filter(Boolean) })} placeholder="Pains (semicolon-separated)" style={inputStyle} />
            <input value={(seg.channels || []).join(', ')} onChange={(e) => updateSegment(i, { channels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Channels they hang out in: X, Reddit, IndieHackers, …" style={inputStyle} />
          </div>
        ))}
        <button type="button" onClick={addSegment} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px dashed var(--rule-strong)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' }}>+ Add segment</button>
      </div>

      {/* Voice */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>Voice</h2>
          <Link href={`/agents/voice?ws=${ws.id}`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
            Train voice from X →
          </Link>
        </div>
        <div>
          <label style={labelStyle}>Source X handle (without @)</label>
          <input
            value={ws.voice_handle || ''}
            onChange={(e) => setWs((c) => ({ ...c, voice_handle: e.target.value.replace(/^@/, '') }))}
            onBlur={() => save({ voice_handle: ws.voice_handle })}
            placeholder="growthhuntai"
            style={inputStyle}
          />
        </div>
        {ws.voice?.summary && (
          <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 12 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Current voice profile
            </p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.55 }}>
              {ws.voice.summary}
            </p>
            {ws.voice.trained_at && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
                trained {new Date(ws.voice.trained_at).toISOString().slice(0, 10)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Competitors */}
      <div style={sectionStyle}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>Competitors</h2>
        {ws.competitors.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <input value={c.name} onChange={(e) => updateCompetitor(i, { name: e.target.value })} placeholder="Competitor name" style={inputStyle} />
            <input value={c.url || ''} onChange={(e) => updateCompetitor(i, { url: e.target.value })} placeholder="competitor.com" style={inputStyle} />
            <button type="button" onClick={() => removeCompetitor(i)} style={{ background: 'transparent', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '0 14px', cursor: 'pointer', color: 'var(--ink-dim)' }}>×</button>
          </div>
        ))}
        <button type="button" onClick={addCompetitor} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px dashed var(--rule-strong)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' }}>+ Add competitor</button>
      </div>

      {/* Agent launchers */}
      <div style={sectionStyle}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>Connected agents</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)' }}>Every agent below uses this workspace as its context.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          <Link href={`/agents/icp?ws=${ws.id}`} className="btn-line" style={{ textAlign: 'center', padding: '10px 14px' }}>ICP Agent</Link>
          <Link href={`/agents/voice?ws=${ws.id}`} className="btn-line" style={{ textAlign: 'center', padding: '10px 14px' }}>Voice Trainer</Link>
          <Link href={`/agents/landing?ws=${ws.id}`} className="btn-line" style={{ textAlign: 'center', padding: '10px 14px' }}>Landing Doctor</Link>
          <Link href={`/agents/creator?ws=${ws.id}`} className="btn-line" style={{ textAlign: 'center', padding: '10px 14px' }}>Creator Outreach</Link>
          <Link href={`/agents/radar?ws=${ws.id}`} className="btn-line" style={{ textAlign: 'center', padding: '10px 14px' }}>Community Radar</Link>
        </div>
      </div>
    </div>
  )
}
