'use client'

import { useState, useMemo, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type ExamplePost = {
  title: string
  score: number
  comments: number
  url: string
}

type Template = {
  id: string
  pattern: string
  topic: string
  format: string
  hook_type: string
  scenario: string
  examples: ExamplePost[]
  avg_score: number
  frequency: number
  tips: string
}

type Step = 1 | 2 | 3 | 4
type GenerateStatus = 'idle' | 'loading' | 'done' | 'error'

// ── Scenario config — monochrome, accent-only ──────────────────────────────────

const SCENARIOS = [
  {
    id: 'launch',
    num: '01',
    label: 'Launch my product',
    sub: 'Show HN patterns',
    description: 'Show HN patterns that get your product in front of the right people.',
  },
  {
    id: 'discussion',
    num: '02',
    label: 'Start a discussion',
    sub: 'Ask HN patterns',
    description: 'Ask HN patterns that pull in the community and spark real conversations.',
  },
  {
    id: 'data',
    num: '03',
    label: 'Share data or research',
    sub: 'Data & list patterns',
    description: 'Data-driven patterns that make readers stop and pay attention.',
  },
  {
    id: 'ai-tool',
    num: '04',
    label: 'Showcase an AI tool',
    sub: 'AI launch patterns',
    description: 'Patterns built for AI product launches that cut through the noise.',
  },
  {
    id: 'contrarian',
    num: '05',
    label: 'Share a hot take',
    sub: 'Opinion patterns',
    description: 'Contrarian and opinion patterns that spark arguments — the good kind.',
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractPlaceholders(pattern: string): string[] {
  const matches = pattern.match(/\{([^}]+)\}/g) || []
  return [...new Set(matches.map(m => m.slice(1, -1)))]
}

function formatLabel(key: string): string {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function PatternText({ pattern, values }: { pattern: string; values: Record<string, string> }) {
  const parts = pattern.split(/(\{[^}]+\})/g)
  return (
    <span>
      {parts.map((part, i) => {
        const isPlaceholder = /^\{[^}]+\}$/.test(part)
        if (!isPlaceholder) return <span key={i}>{part}</span>
        const key = part.slice(1, -1)
        const filled = values[key]
        return (
          <span key={i} style={{
            fontFamily: 'var(--mono)',
            color: filled ? 'var(--ink)' : 'var(--accent)',
            background: filled ? 'var(--bg-card)' : 'var(--accent-soft)',
            borderRadius: 4,
            padding: '1px 6px',
            fontSize: '0.88em',
            letterSpacing: 0,
          }}>
            {filled || part}
          </span>
        )
      })}
    </span>
  )
}

// ── Step bar — uses eyebrow + tag design language ──────────────────────────────

function StepBar({ current }: { current: Step }) {
  const steps: { n: Step; label: string }[] = [
    { n: 1, label: 'Goal' },
    { n: 2, label: 'Template' },
    { n: 3, label: 'Details' },
    { n: 4, label: 'Generate' },
  ]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      marginBottom: 56,
      fontFamily: 'var(--mono)', fontSize: 11,
      textTransform: 'uppercase', letterSpacing: '0.1em',
    }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: s.n === current ? 'var(--ink)' : s.n < current ? 'var(--ink-dim)' : 'var(--ink-faint)',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              background: s.n === current
                ? 'var(--ink)'
                : s.n < current
                ? 'var(--accent)'
                : 'transparent',
              border: s.n > current ? '1.5px solid var(--rule-strong)' : 'none',
              color: s.n >= current ? (s.n === current ? 'var(--bg)' : 'var(--ink-faint)') : '#fff',
            }}>
              {s.n < current ? '✓' : s.n}
            </div>
            <span style={{ fontWeight: s.n === current ? 600 : 400 }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 28, height: 1,
              background: s.n < current ? 'var(--rule-strong)' : 'var(--rule)',
              margin: '0 12px',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HNGeneratorClient({ templates }: { templates: Template[] }) {
  const [step, setStep] = useState<Step>(1)
  const [scenario, setScenario] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<GenerateStatus>('idle')
  const [result, setResult] = useState<{
    titles?: string[]
    best_title?: string
    body?: string
    error?: string
  } | null>(null)
  const [activeTitle, setActiveTitle] = useState(0)
  const [copied, setCopied] = useState(false)

  const topRef = useRef<HTMLDivElement>(null)

  const scenarioTemplates = useMemo(
    () => templates.filter(t => t.scenario === scenario),
    [templates, scenario]
  )

  const selected = useMemo(
    () => templates.find(t => t.id === selectedId) ?? null,
    [templates, selectedId]
  )

  const placeholders = useMemo(
    () => (selected ? extractPlaceholders(selected.pattern) : []),
    [selected]
  )

  const scenarioConfig = useMemo(
    () => SCENARIOS.find(s => s.id === scenario) ?? null,
    [scenario]
  )

  function goStep(s: Step) {
    setStep(s)
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  function pickScenario(id: string) {
    setScenario(id)
    setSelectedId(null)
    setValues({})
    setResult(null)
    setStatus('idle')
    goStep(2)
  }

  function pickTemplate(id: string) {
    setSelectedId(id)
    setValues({})
    setResult(null)
    setStatus('idle')
    goStep(3)
  }

  function buildPreview(): string {
    if (!selected) return ''
    let out = selected.pattern
    for (const key of placeholders) {
      out = out.replace(`{${key}}`, values[key] || `{${key}}`)
    }
    return out
  }

  async function handleGenerate() {
    if (!selected) return
    setStatus('loading')
    setResult(null)
    goStep(4)
    try {
      const res = await fetch('/api/hn-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selected, placeholders: values, description }),
      })
      const data = await res.json()
      setResult(data)
      setStatus(data.error ? 'error' : 'done')
      setActiveTitle(0)
    } catch {
      setStatus('error')
      setResult({ error: 'Network error' })
    }
  }

  function handleCopy() {
    if (!result) return
    const title = result.titles?.[activeTitle] || result.best_title || ''
    const text = `${title}\n\n${result.body || ''}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Shared input style — matches existing forms ────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elev)',
    border: '1px solid var(--rule-strong)',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    fontFamily: 'inherit',
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const eyebrowStyle: React.CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    display: 'block',
    marginBottom: 8,
  }

  return (
    <section style={{ padding: '72px 0 100px', borderTop: '1px solid var(--rule)' }}>
      <div className="shell" style={{ maxWidth: 900 }}>
        <div ref={topRef} style={{ scrollMarginTop: 80 }} />
        <StepBar current={step} />

        {/* ── STEP 1: Goal ── */}
        {step === 1 && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>
              <span className="dot" />Choose your goal
            </div>
            <h2 style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              lineHeight: 1.04,
              margin: '0 0 48px',
            }}>
              What are you trying to<br />
              <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>accomplish on HN?</em>
            </h2>

            {/* Grid like .eco-grid — 1px gap, rule background */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 1,
              background: 'var(--rule)',
              border: '1px solid var(--rule)',
            }}>
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => pickScenario(s.id)}
                  style={{
                    background: 'var(--bg)',
                    padding: '32px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: 'none',
                    fontFamily: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'background 0.15s',
                    minHeight: 180,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elev)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
                >
                  <div style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--accent)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}>
                    {s.num}
                  </div>
                  <div style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 28,
                    letterSpacing: '-0.02em',
                    color: 'var(--ink)',
                    lineHeight: 1.1,
                  }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-dim)', lineHeight: 1.55, flex: 1 }}>
                    {s.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="tag">{templates.filter(t => t.scenario === s.id).length} patterns</span>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11,
                      color: 'var(--accent)', letterSpacing: '0.05em',
                    }}>
                      Select →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Template ── */}
        {step === 2 && scenarioConfig && (
          <div>
            {/* Back */}
            <button
              onClick={() => goStep(1)}
              className="detail-back"
              style={{ border: 'none', background: 'none', padding: 0, marginBottom: 32 }}
            >
              ← Back
            </button>

            <div className="section-head" style={{ padding: '0 0 28px', marginBottom: 36 }}>
              <div className="num">{scenarioConfig.num}</div>
              <div>
                <h2 style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 'clamp(28px, 3.5vw, 44px)',
                  fontWeight: 400,
                  letterSpacing: '-0.022em',
                  margin: '0 0 8px',
                }}>
                  {scenarioConfig.label}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0 }}>
                  {scenarioTemplates.length} patterns, each backed by real high-scoring posts.
                  Click one to continue.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
              {scenarioTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t.id)}
                  style={{
                    background: 'var(--bg)',
                    border: 'none',
                    padding: '24px 28px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 24,
                    alignItems: 'start',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elev)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
                >
                  <div>
                    {/* Pattern */}
                    <p style={{
                      fontWeight: 600, fontSize: 15,
                      margin: '0 0 12px', lineHeight: 1.5, color: 'var(--ink)',
                    }}>
                      <PatternText pattern={t.pattern} values={{}} />
                    </p>

                    {/* Real examples */}
                    {t.examples?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                        {t.examples.slice(0, 2).map((ex, i) => (
                          <a key={i} href={ex.url} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              display: 'flex', alignItems: 'baseline', gap: 8,
                              textDecoration: 'none', fontSize: 12.5,
                            }}
                          >
                            <span style={{
                              fontFamily: 'var(--mono)', fontSize: 10.5,
                              color: 'var(--accent)', flexShrink: 0,
                            }}>▲{ex.score}</span>
                            <span style={{
                              color: 'var(--ink-dim)',
                              overflow: 'hidden', display: '-webkit-box',
                              WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                            }}>{ex.title}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="tag">{t.format}</span>
                      <span className="tag">{t.hook_type}</span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-end', gap: 10, flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11,
                      color: 'var(--ink-faint)',
                    }}>
                      ▲ {t.avg_score} avg
                    </span>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11,
                      color: 'var(--accent)', letterSpacing: '0.05em',
                    }}>
                      Use →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Details ── */}
        {step === 3 && selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Back */}
            <button
              onClick={() => goStep(2)}
              className="detail-back"
              style={{ border: 'none', background: 'none', padding: 0, alignSelf: 'flex-start' }}
            >
              ← Back to templates
            </button>

            {/* Pattern panel — example-box style */}
            <div className="example-box">
              <div className="head">
                <span>Selected pattern</span>
                <span style={{ color: 'var(--accent)' }}>▲ {selected.avg_score} avg score</span>
              </div>
              <div className="body">
                <p style={{
                  fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
                  color: 'var(--ink)', lineHeight: 1.55, margin: '0 0 12px',
                }}>
                  <PatternText pattern={selected.pattern} values={values} />
                </p>

                {/* Live preview */}
                {placeholders.some(k => values[k]) && (
                  <div style={{
                    background: 'var(--bg-elev)', borderRadius: 6,
                    padding: '8px 12px', fontSize: 13, color: 'var(--ink-dim)',
                    lineHeight: 1.5, fontStyle: 'italic', marginBottom: 12,
                    border: '1px solid var(--rule)',
                  }}>
                    {buildPreview()}
                  </div>
                )}

                {/* Tip */}
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  paddingTop: 10, borderTop: '1px solid var(--rule)',
                  marginTop: 4,
                }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: 'var(--accent)', flexShrink: 0, paddingTop: 1,
                  }}>Tip</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-dim)', lineHeight: 1.55 }}>
                    {selected.tips}
                  </span>
                </div>
              </div>
            </div>

            {/* Inputs */}
            {placeholders.length > 0 && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 20 }}>
                  <span className="dot" />Fill in the blanks
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {placeholders.map(key => (
                    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={eyebrowStyle}>{formatLabel(key)}</span>
                      <input
                        type="text"
                        value={values[key] || ''}
                        onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                        placeholder={
                          key === 'product' ? 'e.g. my SaaS analytics tool' :
                          key === 'metric' ? 'e.g. 10k users' :
                          key === 'timeframe' ? 'e.g. 3 months' :
                          key === 'revenue' ? 'e.g. 5,000' :
                          key === 'competitor' ? 'e.g. Notion' :
                          `{${key}}`
                        }
                        style={inputStyle}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Product description
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does your product do? Who is it for? Any key numbers or differentiators? More context = better output."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.65 }}
              />
            </div>

            {/* Real examples */}
            {selected.examples?.length > 0 && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>
                  Real posts using this pattern
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
                  {selected.examples.map((ex, i) => (
                    <a key={i} href={ex.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'baseline', gap: 12,
                        padding: '12px 16px', textDecoration: 'none',
                        background: 'var(--bg)', transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elev)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
                    >
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 11,
                        color: 'var(--accent)', flexShrink: 0, minWidth: 44,
                      }}>▲ {ex.score}</span>
                      <span style={{ fontSize: 13.5, color: 'var(--ink-dim)', lineHeight: 1.45, flex: 1 }}>
                        {ex.title}
                      </span>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 10,
                        color: 'var(--ink-faint)', flexShrink: 0,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button
                onClick={handleGenerate}
                style={{
                  background: 'var(--ink)', color: 'var(--bg)',
                  border: 'none', borderRadius: 999,
                  padding: '12px 32px', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', flex: 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}
              >
                Generate with AI →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Output ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Back */}
            <button
              onClick={() => goStep(3)}
              className="detail-back"
              style={{ border: 'none', background: 'none', padding: 0, alignSelf: 'flex-start' }}
            >
              ← Edit details
            </button>

            {status === 'loading' && (
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--rule)',
                borderRadius: 12, padding: '64px 40px', textAlign: 'center',
              }}>
                <div className="eyebrow">Generating your post…</div>
              </div>
            )}

            {status === 'error' && (
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--rule-strong)',
                borderRadius: 10, padding: '20px 24px',
              }}>
                <span className="eyebrow" style={{ color: 'var(--warn)' }}>Error</span>
                <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--ink-dim)' }}>
                  {result?.error || 'Something went wrong.'}{' '}
                  Make sure <code style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>ANTHROPIC_API_KEY</code> is set in <code style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>.env.local</code>.
                </p>
              </div>
            )}

            {status === 'done' && result && (
              <>
                {/* Title variants */}
                <div>
                  <div className="eyebrow" style={{ marginBottom: 12 }}>
                    <span className="dot" />Choose a title
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
                    {result.titles?.map((title, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTitle(i)}
                        style={{
                          textAlign: 'left',
                          background: activeTitle === i ? 'var(--accent-soft)' : 'var(--bg)',
                          border: 'none',
                          padding: '16px 20px',
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'background 0.1s',
                          borderLeft: activeTitle === i ? '3px solid var(--accent)' : '3px solid transparent',
                        }}
                        onMouseEnter={e => {
                          if (activeTitle !== i) e.currentTarget.style.background = 'var(--bg-elev)'
                        }}
                        onMouseLeave={e => {
                          if (activeTitle !== i) e.currentTarget.style.background = 'var(--bg)'
                        }}
                      >
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 10,
                          color: activeTitle === i ? 'var(--accent)' : 'var(--ink-faint)',
                          flexShrink: 0, paddingTop: 3,
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                        }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>{title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body */}
                {result.body && (
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 12 }}>Post body</div>
                    <div className="example-box">
                      <div className="head">
                        <span>HN post text</span>
                        <span>{result.titles?.[activeTitle]?.slice(0, 40)}…</span>
                      </div>
                      <div className="body" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-dim)' }}>
                        {result.body}
                      </div>
                    </div>
                  </div>
                )}

                {/* Copy */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      background: copied ? 'var(--ink)' : 'var(--accent)',
                      color: '#fff', border: 'none',
                      borderRadius: 999, padding: '12px 32px',
                      fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                      flex: 1, transition: 'background 0.15s',
                    }}
                  >
                    {copied ? '✓ Copied to clipboard' : 'Copy post'}
                  </button>
                  <button
                    onClick={() => { setStatus('idle'); setResult(null); goStep(3) }}
                    className="btn-line"
                    style={{ borderRadius: 999, padding: '12px 20px', whiteSpace: 'nowrap' }}
                  >
                    Regenerate
                  </button>
                </div>
              </>
            )}

            {/* Start over */}
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <button
                onClick={() => {
                  setStep(1); setScenario(null); setSelectedId(null)
                  setResult(null); setStatus('idle')
                }}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 12, fontFamily: 'var(--mono)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--ink-faint)', cursor: 'pointer',
                  textDecoration: 'underline', padding: 0,
                }}
              >
                Start over
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
