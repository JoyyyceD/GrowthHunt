'use client'

import { useState, type FormEvent } from 'react'

type Phase = 'idle' | 'expanded' | 'submitting' | 'done' | 'error'

interface ApplyResult {
  ok: boolean
  prUrl: string
  branch: string
  files: string[]
}

/**
 * Apply Fixes via PR — collects a fine-grained GitHub PAT + repo, hits
 * /api/geo/apply-fixes, returns a PR link. PAT is never stored.
 */
export function ApplyFixesBlock({ url }: { url: string }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [repo, setRepo] = useState('')
  const [token, setToken] = useState('')
  const [base, setBase] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ApplyResult | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!repo.trim() || !token.trim()) return
    setPhase('submitting')
    setError('')
    try {
      const res = await fetch('/api/geo/apply-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, repo: repo.trim(), token: token.trim(), baseBranch: base.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'PR creation failed.')
        setPhase('error')
        return
      }
      setResult(data as ApplyResult)
      setPhase('done')
      // Wipe token from memory once we're done with it.
      setToken('')
    } catch {
      setError('Network error — please try again.')
      setPhase('error')
    }
  }

  if (phase === 'done' && result) {
    return (
      <div style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 12, padding: '20px 24px' }}>
        <div className="eyebrow" style={{ marginBottom: 6, color: '#15803d' }}>
          <span className="dot" style={{ background: '#16a34a' }} />PR opened
        </div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: '0 0 6px', color: '#14532d' }}>
          Your fix PR is ready
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#166534', lineHeight: 1.55 }}>
          Added: <code>{result.files.join('</code>, <code>')}</code> on branch <code>{result.branch}</code>.
        </p>
        <a
          href={result.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999, padding: '10px 20px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          Open PR on GitHub →
        </a>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <div style={{ border: '1px dashed var(--rule-strong)', borderRadius: 12, padding: '24px 26px', background: 'var(--bg-elev)' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Apply fixes via PR · beta</div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, margin: '0 0 8px' }}>
          One-click PR to your repo
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 18px', lineHeight: 1.6, maxWidth: 580 }}>
          We&apos;ll open a PR that adds the audit report + a Claude Code slash command
          (<code>/apply-geo-fixes</code>) so your AI editor can walk the codebase and apply every
          fix. Needs a fine-grained GitHub PAT with <em>contents: write</em> + <em>pull requests:
          write</em> on the target repo. The token is used once and never stored.
        </p>
        <button
          type="button"
          onClick={() => setPhase('expanded')}
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Open a fix PR →
        </button>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1.5px solid var(--rule-strong)',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14,
    fontFamily: 'var(--mono)',
    color: 'var(--ink)',
    outline: 'none',
  }

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '24px 26px', background: 'var(--bg-elev)' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Open PR</div>
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, margin: '0 0 14px' }}>
        Repo + token
      </h3>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Repository
          </label>
          <input
            type="text"
            required
            placeholder="owner/name"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Fine-grained PAT (never stored)
          </label>
          <input
            type="password"
            required
            placeholder="github_pat_…"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            style={inputStyle}
          />
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
            Generate at <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-dim)' }}>github.com/settings/personal-access-tokens/new</a>. Scope: <em>contents write</em> + <em>pull requests write</em>, only on the target repo.
          </p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Base branch (optional)
          </label>
          <input
            type="text"
            placeholder="main (defaults to repo's default branch)"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            type="submit"
            disabled={phase === 'submitting'}
            style={{ background: phase === 'submitting' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'submitting' ? 'not-allowed' : 'pointer' }}
          >
            {phase === 'submitting' ? 'Opening PR…' : 'Open PR →'}
          </button>
          <button
            type="button"
            onClick={() => { setPhase('idle'); setToken(''); setError('') }}
            style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '12px 18px', fontSize: 14, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
        {phase === 'error' && (
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#c0392b' }}>{error}</p>
        )}
      </form>
    </div>
  )
}
