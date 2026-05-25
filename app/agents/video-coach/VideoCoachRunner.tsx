'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Workspace } from '@/lib/workspace/types'
import type { VideoScript, VideoScenario } from '@/lib/agents/video-coach'
import { SCENARIO_LABEL } from '@/lib/agents/video-coach'

type Phase = 'idle' | 'running' | 'done' | 'error'
const SCENARIOS: VideoScenario[] = ['demo', 'founder_hook', 'tutorial', 'story']

export function VideoCoachRunner({ workspace, initialScripts }: { workspace: Workspace; initialScripts: VideoScript[] }) {
  const [list, setList] = useState<VideoScript[]>(initialScripts)
  const [active, setActive] = useState<VideoScript | null>(initialScripts[0] || null)
  const [scenario, setScenario] = useState<VideoScenario>('demo')
  const [duration, setDuration] = useState(60)
  const [topic, setTopic] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [err, setErr] = useState('')

  async function generate() {
    if (!topic.trim()) { toast.error('Topic is required'); return }
    setPhase('running'); setErr('')
    try {
      const res = await fetch('/api/agents/video-coach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, scenario, duration_sec: duration, topic: topic.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.script) { setErr(data.error || 'Failed'); setPhase('error'); return }
      setList((prev) => [data.script as VideoScript, ...prev])
      setActive(data.script as VideoScript)
      setPhase('done')
      toast.success('Script generated')
    } catch (e) { setErr((e as Error).message); setPhase('error') }
  }

  function copyShotList(s: VideoScript) {
    const text = s.shot_list.map((shot, i) => `[${i + 1}] ${shot.t_start}s–${shot.t_end}s\nShot: ${shot.shot}\nVO: ${shot.vo}\nB-roll: ${shot.b_roll}\nText: ${shot.on_screen_text}`).join('\n\n')
    try { navigator.clipboard.writeText(text); toast.success('Shot list copied') } catch { /* noop */ }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)',
    borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit',
    color: 'var(--ink)', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scenario</label>
            <select value={scenario} onChange={(e) => setScenario(e.target.value as VideoScenario)} style={inputStyle}>
              {SCENARIOS.map((s) => <option key={s} value={s}>{SCENARIO_LABEL[s]}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duration (s)</label>
            <input type="number" min={15} max={180} value={duration} onChange={(e) => setDuration(Math.min(180, Math.max(15, Number(e.target.value) || 60)))} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Topic</label>
          <textarea rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What is this video about? e.g. 'demo of the GTM Mission Control chat, focusing on the one-line command UX'" style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
        </div>
        <button type="button" onClick={generate} disabled={phase === 'running'} style={{ background: phase === 'running' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'running' ? 'not-allowed' : 'pointer', marginTop: 14 }}>
          {phase === 'running' ? 'Drafting shot list…' : 'Generate script →'}
        </button>
        {err && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c0392b' }}>{err}</p>}
      </div>

      {list.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', alignSelf: 'center' }}>HISTORY:</span>
          {list.slice(0, 8).map((s) => (
            <button key={s.id || s.title} type="button" onClick={() => setActive(s)} style={{ background: active === s ? 'var(--ink)' : 'transparent', color: active === s ? 'var(--bg)' : 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '4px 12px', fontSize: 12, cursor: 'pointer', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.title.slice(0, 32)}{s.title.length > 32 ? '…' : ''}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 22px', background: 'var(--bg-elev)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, margin: 0 }}>{active.title}</h2>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)' }}>· {active.duration_sec}s · {SCENARIO_LABEL[active.scenario]}</span>
              <button type="button" onClick={() => copyShotList(active)} style={{ marginLeft: 'auto', background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Copy shot list</button>
            </div>
            {active.notes && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-dim)', fontStyle: 'italic' }}>{active.notes}</p>}
          </div>

          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-elev)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, width: 80 }}>Time</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, width: 90 }}>Shot</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>VO</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>B-roll / On-screen</th>
                </tr>
              </thead>
              <tbody>
                {active.shot_list.map((s, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--rule)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-dim)' }}>{s.t_start}–{s.t_end}s</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{s.shot}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--ink)' }}>{s.vo}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink-dim)' }}>
                      {s.b_roll}{s.on_screen_text && <div style={{ marginTop: 4, fontWeight: 600, color: 'var(--accent)' }}>📺 {s.on_screen_text}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <Block title="Pre-shoot checklist" items={active.checklist} />
            <Block title="Pre-upload self-check" items={active.pre_upload} accent />
          </div>

          {active.external_tools.length > 0 && (
            <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 20px', background: 'var(--bg-elev)' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Recommended tools</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {active.external_tools.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 13, color: 'var(--ink)' }}>
                    <strong style={{ minWidth: 130, color: 'var(--ink)' }}>{t.name}</strong>
                    <span style={{ flex: 1, color: 'var(--ink-dim)' }}>{t.what}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{t.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Block({ title, items, accent }: { title: string; items: string[]; accent?: boolean }) {
  if (!items?.length) return null
  return (
    <div style={{ border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--rule)'}`, borderRadius: 12, padding: '14px 18px', background: accent ? 'var(--accent-soft)' : 'var(--bg-elev)' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />{title}</div>
      <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((it, i) => <li key={i} style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{it}</li>)}
      </ol>
    </div>
  )
}
