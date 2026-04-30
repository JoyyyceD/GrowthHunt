'use client'

import { useState } from 'react'
import type { DayPlan } from '../../calendar'
import type { Exemplar } from '@/lib/viralx/exemplars'

interface StoredDay {
  day_number: number
  archetype: string
  content_text: string | null
  scheduled_at: string | null
  posted_at: string | null
  x_post_id: string | null
  failed_at: string | null
  failure_reason: string | null
}

interface Props {
  sessionId: string
  plan: DayPlan
  stored: StoredDay | null
  exemplars: Exemplar[]
  hasCredentials: boolean
}

type Status = 'idea' | 'drafted' | 'scheduled' | 'posted' | 'failed'

export default function DayCard({ sessionId, plan, stored, exemplars, hasCredentials }: Props) {
  const [archetype, setArchetype] = useState<string>(stored?.archetype || plan.archetype)
  void setArchetype
  const [content, setContent] = useState<string>(stored?.content_text || '')
  const [postedId, setPostedId] = useState<string | null>(stored?.x_post_id ?? null)
  const [scheduledAt, setScheduledAt] = useState<string | null>(stored?.scheduled_at ?? null)
  const [failedReason, setFailedReason] = useState<string | null>(stored?.failure_reason ?? null)
  const [pickerValue, setPickerValue] = useState<string>(localPickerDefault())
  const [busy, setBusy] = useState<'gen' | 'save' | 'post' | 'schedule' | 'cancel' | null>(null)
  const [error, setError] = useState('')

  const status: Status = postedId
    ? 'posted'
    : failedReason
      ? 'failed'
      : scheduledAt
        ? 'scheduled'
        : content
          ? 'drafted'
          : 'idea'

  async function generate() {
    setBusy('gen'); setError('')
    try {
      const res = await fetch('/api/viralx/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, day_number: plan.day, archetype }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setContent(data.text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  async function saveEdit() {
    setBusy('save'); setError('')
    try {
      const res = await fetch('/api/viralx/days', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, day_number: plan.day, archetype, content_text: content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  async function postToX() {
    if (!confirm(`Post this tweet to X right now?\n\n${content}`)) return
    setBusy('post'); setError('')
    try {
      const saveRes = await fetch('/api/viralx/days', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, day_number: plan.day, archetype, content_text: content }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok || !saveData.day?.id) throw new Error(saveData.error || 'could not resolve day_id')

      const res = await fetch('/api/viralx/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_id: saveData.day.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setPostedId(data.x_post_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  async function schedule() {
    if (!pickerValue) { setError('pick a date/time first'); return }
    setBusy('schedule'); setError('')
    try {
      // datetime-local string lacks timezone; treat as user's local time
      const localDate = new Date(pickerValue)
      const res = await fetch('/api/viralx/days', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId, day_number: plan.day, archetype,
          content_text: content,
          scheduled_at: localDate.toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setScheduledAt(data.day?.scheduled_at ?? null)
      setFailedReason(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  async function cancelSchedule() {
    setBusy('cancel'); setError('')
    try {
      const res = await fetch('/api/viralx/days', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId, day_number: plan.day, archetype,
          scheduled_at: null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setScheduledAt(null)
      setFailedReason(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  const isLocked = !!postedId
  const isScheduled = !!scheduledAt && !postedId

  return (
    <article
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--rule)',
        borderRadius: 16,
        padding: 20,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={eyebrowStyle}>Day {String(plan.day).padStart(2, '0')}</span>
        <span style={pillStyle}>{archetype}</span>
      </div>

      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.2, margin: 0 }}>{plan.title}</h2>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{plan.hint}</p>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value.slice(0, 280))}
        onBlur={() => content && content !== stored?.content_text && saveEdit()}
        placeholder={status === 'idea' ? 'Click Generate to draft this with MiniMax →' : ''}
        rows={4}
        disabled={busy !== null || isLocked || isScheduled}
        style={textareaStyle}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>
          {content.length}/280
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={generate}
            disabled={busy !== null || isLocked || isScheduled}
            style={pillBtn(false, busy !== null || isLocked || isScheduled)}
          >
            {busy === 'gen' ? 'Generating…' : content ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Schedule / Post controls */}
      {!isLocked && (
        <div style={{
          padding: '12px 14px', background: 'var(--bg-card)',
          border: '1px solid var(--rule)', borderRadius: 10,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {isScheduled ? (
            <>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-dim)' }}>
                ⏱ <strong>Scheduled</strong> for {formatScheduled(scheduledAt!)}
                {' · '}<span style={{ color: 'var(--ink-faint)' }}>cron will publish automatically</span>
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button" onClick={cancelSchedule} disabled={busy !== null}
                  style={pillBtn(false, busy !== null)}
                >
                  {busy === 'cancel' ? 'Cancelling…' : 'Cancel schedule'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="datetime-local"
                  value={pickerValue}
                  min={localPickerDefault()}
                  onChange={e => setPickerValue(e.target.value)}
                  disabled={busy !== null || !content || !hasCredentials}
                  style={dateInputStyle}
                />
                <button
                  type="button"
                  onClick={schedule}
                  disabled={busy !== null || !content || !hasCredentials || !pickerValue}
                  title={!hasCredentials ? 'Connect X first at /viralx/credentials' : (!content ? 'Generate or write a draft first' : '')}
                  style={pillBtn(false, busy !== null || !content || !hasCredentials || !pickerValue)}
                >
                  {busy === 'schedule' ? 'Scheduling…' : 'Schedule'}
                </button>
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>or</span>
                <button
                  type="button"
                  onClick={postToX}
                  disabled={busy !== null || !content || !hasCredentials}
                  title={!hasCredentials ? 'Connect X first at /viralx/credentials' : ''}
                  style={pillBtn(true, busy !== null || !content || !hasCredentials)}
                >
                  {busy === 'post' ? 'Posting…' : 'Post now'}
                </button>
              </div>
              {!hasCredentials && (
                <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-faint)' }}>
                  <a href="/viralx/credentials" style={{ color: 'var(--ink-dim)', textDecoration: 'underline' }}>
                    Connect your X account
                  </a> to enable posting.
                </p>
              )}
            </>
          )}

          {failedReason && (
            <p style={{ margin: 0, fontSize: 11, color: '#dc2626' }}>
              ⚠️ Last attempt failed: {failedReason}
            </p>
          )}
        </div>
      )}

      {error && <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>{error}</p>}

      {/* Exemplars */}
      {exemplars.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
            Studied from {exemplars.length} real tweet{exemplars.length === 1 ? '' : 's'}
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {exemplars.map(ex => (
              <a key={ex.id} href={ex.url} target="_blank" rel="noopener noreferrer"
                 style={exemplarCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>@{ex.handle}</span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>♥ {fmt(ex.like_count)}</span>
                </div>
                <p style={{ fontSize: 11, lineHeight: 1.4, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {ex.text.length > 160 ? ex.text.slice(0, 160) + '…' : ex.text}
                </p>
              </a>
            ))}
          </div>
        </details>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--rule)' }}>
        <StatusDot status={status} />
        {postedId && (
          <a
            href={`https://x.com/i/web/status/${postedId}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-dim)', textDecoration: 'underline' }}
          >
            view on X →
          </a>
        )}
      </div>
    </article>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────

function localPickerDefault(): string {
  // datetime-local format: YYYY-MM-DDTHH:mm in user's local timezone
  const d = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now as default
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatScheduled(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function fmt(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n)
}

const eyebrowStyle: React.CSSProperties = {
  fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

const pillStyle: React.CSSProperties = {
  fontSize: 10, fontFamily: 'var(--mono)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--ink-dim)', background: 'var(--bg-card)',
  border: '1px solid var(--rule)', borderRadius: 999, padding: '3px 10px',
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-card)',
  border: '1px solid var(--rule-strong)',
  borderRadius: 10,
  fontSize: 13, lineHeight: 1.5, color: 'var(--ink)',
  fontFamily: 'inherit', resize: 'vertical', outline: 'none',
}

const dateInputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8,
  border: '1px solid var(--rule-strong)',
  background: 'var(--bg-elev)',
  fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink)',
  outline: 'none',
}

const exemplarCardStyle: React.CSSProperties = {
  display: 'block', padding: '8px 10px',
  background: 'var(--bg-card)', border: '1px solid var(--rule)',
  borderRadius: 8, textDecoration: 'none', color: 'inherit',
}

function pillBtn(primary: boolean, disabled = false): React.CSSProperties {
  return {
    fontSize: 12, fontFamily: 'var(--mono)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    padding: '8px 14px', borderRadius: 999,
    border: primary ? 'none' : '1px solid var(--rule-strong)',
    background: primary ? (disabled ? 'var(--bg-card)' : 'var(--accent)') : 'var(--bg-card)',
    color: primary ? (disabled ? 'var(--ink-faint)' : 'var(--accent-ink)') : 'var(--ink)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
  }
}

function StatusDot({ status }: { status: Status }) {
  const colorMap: Record<Status, string> = {
    idea: 'var(--ink-faint)',
    drafted: 'var(--accent)',
    scheduled: '#eab308',
    posted: '#22c55e',
    failed: '#dc2626',
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colorMap[status] }} />
      {status}
    </span>
  )
}
