'use client'

import { useEffect, useRef, useState } from 'react'
import { getSoonFeatures } from '@/lib/features'

export function WaitlistModal({
  open, onClose, prefilledEmail,
}: {
  open: boolean
  onClose: () => void
  prefilledEmail: string
}) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState(prefilledEmail)
  const [picks, setPicks] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const upcoming = getSoonFeatures()

  useEffect(() => {
    if (open) { setStep(1); setDone(false); setPicks([]); setEmail(prefilledEmail) }
  }, [open, prefilledEmail])

  if (!open) return null

  const togglePick = (id: string) => {
    setPicks(p => p.includes(id) ? p.filter(x => x !== id) : (p.length < 3 ? [...p, id] : p))
  }

  const handleFinish = async () => {
    setDone(true)
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'waitlist-modal', features: picks }),
      })
    } catch { /* silent */ }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: step === 2 ? 640 : 520 }}
      >
        <button className="close" onClick={onClose}>×</button>

        {done ? (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16, color: 'var(--accent)' }}><span className="dot" />You&apos;re in</div>
            <h3>See you in beta.</h3>
            <p>We&apos;ll prioritize <b style={{ color: 'var(--accent)' }}>{picks.length}</b> features based on what early users like you picked. Email coming when it&apos;s your turn.</p>
            <button
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '12px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : step === 1 ? (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />Step 1 of 2</div>
            <h3>Get on the early-access list.</h3>
            <p>200 founders. One agent. Built around what you actually need.</p>
            <form onSubmit={e => { e.preventDefault(); setStep(2) }}>
              <input
                type="email"
                placeholder="founder@yourstartup.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--rule-strong)', borderRadius: 10, color: 'var(--ink)', fontSize: 15, fontFamily: 'inherit', marginBottom: 14, outline: 'none' }}
              />
              <button
                type="submit"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, width: '100%', cursor: 'pointer' }}
              >
                Continue →
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />Step 2 of 2 · {picks.length}/3 picked</div>
            <h3>Which 3 do you want first?</h3>
            <p>Pick the three features that would change your week. We&apos;ll build those next.</p>
            <div style={{ maxHeight: 320, overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
              {upcoming.map(f => (
                <div
                  key={f.id}
                  className={`feature-pick ${picks.includes(f.id) ? 'active' : ''}`}
                  onClick={() => togglePick(f.id)}
                >
                  <div className="check">{picks.includes(f.id) ? '✓' : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div className="label">{f.name}</div>
                    <div className="label-sub">{f.hook}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              disabled={picks.length === 0}
              onClick={handleFinish}
              style={{
                marginTop: 16,
                background: picks.length ? 'var(--accent)' : 'var(--bg-card)',
                color: picks.length ? 'var(--accent-ink)' : 'var(--ink-faint)',
                border: 'none', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, width: '100%',
                cursor: picks.length ? 'pointer' : 'not-allowed',
              }}
            >
              {picks.length ? `Lock in my ${picks.length} pick${picks.length > 1 ? 's' : ''}` : 'Pick at least 1 to continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function useExitIntent(callback: () => void, enabled: boolean) {
  const fired = useRef(false)
  useEffect(() => {
    if (!enabled) return
    const onLeave = (e: MouseEvent) => {
      if (e.clientY < 0 && !fired.current) {
        fired.current = true
        callback()
      }
    }
    document.addEventListener('mouseleave', onLeave)
    return () => document.removeEventListener('mouseleave', onLeave)
  }, [enabled, callback])
}

export function Toast({ msg }: { msg: string }) {
  return msg ? <div className="toast">{msg}</div> : null
}
