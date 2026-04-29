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

// ── Scenario config ────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: 'launch',
    icon: '🚀',
    label: 'Launch my product',
    description: 'Show HN patterns that get your product in front of the right people.',
    color: 'var(--accent)',
    bg: 'var(--accent-soft)',
    border: 'var(--accent-border)',
  },
  {
    id: 'discussion',
    icon: '💬',
    label: 'Start a discussion',
    description: 'Ask HN patterns that pull in the community and start real conversations.',
    color: '#2563eb',
    bg: '#eff6ff',
    border: 'rgba(37,99,235,0.25)',
  },
  {
    id: 'data',
    icon: '📊',
    label: 'Share data or research',
    description: 'Data-driven patterns that make readers stop and take notice.',
    color: '#059669',
    bg: '#ecfdf5',
    border: 'rgba(5,150,105,0.25)',
  },
  {
    id: 'ai-tool',
    icon: '🤖',
    label: 'Showcase an AI tool',
    description: 'Patterns built for AI launches that stand out from the noise.',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: 'rgba(124,58,237,0.25)',
  },
  {
    id: 'contrarian',
    icon: '🔥',
    label: 'Share a hot take',
    description: 'Opinion and contrarian patterns that spark arguments (the good kind).',
    color: '#d97706',
    bg: '#fffbeb',
    border: 'rgba(217,119,6,0.25)',
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
            padding: '1px 5px',
            fontSize: '0.9em',
          }}>
            {filled || part}
          </span>
        )
      })}
    </span>
  )
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepBar({ current, onStep }: { current: Step; onStep: (s: Step) => void }) {
  const steps: { n: Step; label: string }[] = [
    { n: 1, label: 'Goal' },
    { n: 2, label: 'Template' },
    { n: 3, label: 'Details' },
    { n: 4, label: 'Generate' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 48 }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => s.n < current && onStep(s.n)}
            disabled={s.n >= current}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', cursor: s.n < current ? 'pointer' : 'default',
              padding: '4px 0',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: s.n === current ? 'var(--ink)' : s.n < current ? 'var(--accent)' : 'var(--bg-card)',
              border: s.n === current ? '2px solid var(--ink)' : s.n < current ? '2px solid var(--accent)' : '1.5px solid var(--rule-strong)',
              color: s.n <= current ? '#fff' : 'var(--ink-faint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
              flexShrink: 0,
            }}>
              {s.n < current ? '✓' : s.n}
            </div>
            <span style={{
              fontSize: 12.5, fontWeight: s.n === current ? 600 : 400,
              color: s.n === current ? 'var(--ink)' : s.n < current ? 'var(--ink-dim)' : 'var(--ink-faint)',
            }}>
              {s.label}
            </span>
          </button>
          {i < steps.length - 1 && (
            <div style={{
              width: 32, height: 1,
              background: s.n < current ? 'var(--accent)' : 'var(--rule-strong)',
              margin: '0 8px',
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

  // ── Shared styles
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-elev)',
    border: '1px solid var(--rule-strong)', borderRadius: 10,
    padding: '11px 14px', fontSize: 14, fontFamily: 'inherit',
    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontFamily: 'var(--mono)',
    letterSpacing: '0.09em', textTransform: 'uppercase',
    color: 'var(--ink-faint)', marginBottom: 6,
  }

  return (
    <section style={{ padding: '64px 0 96px', borderTop: '1px solid var(--rule)' }}>
      <div className="shell" style={{ maxWidth: 860 }}>
        <div ref={topRef} style={{ scrollMarginTop: 80 }} />
        <StepBar current={step} onStep={goStep} />

        {/* ── STEP 1: Choose scenario ── */}
        {step === 1 && (
          <div>
            <h2 style={{
              fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 10px',
            }}>
              What's your goal?
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-dim)', margin: '0 0 40px', lineHeight: 1.6 }}>
              Pick a scenario and we'll show you the HN patterns that actually work for it.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => pickScenario(s.id)}
                  style={{
                    background: 'var(--bg-elev)', border: '1.5px solid var(--rule)',
                    borderRadius: 14, padding: '24px 22px', textAlign: 'left',
                    cursor: 'pointer', transition: 'border-color 0.12s, box-shadow 0.12s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = s.color
                    e.currentTarget.style.boxShadow = `0 2px 16px rgba(0,0,0,0.07)`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--rule)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.55 }}>
                    {s.description}
                  </div>
                  <div style={{
                    marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontFamily: 'var(--mono)', color: s.color,
                    background: s.bg, border: `1px solid ${s.border}`,
                    borderRadius: 999, padding: '3px 10px',
                  }}>
                    {templates.filter(t => t.scenario === s.id).length} patterns →
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Pick template ── */}
        {step === 2 && scenarioConfig && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{scenarioConfig.icon}</span>
              <h2 style={{
                fontFamily: 'var(--serif)', fontSize: 'clamp(24px, 3.5vw, 36px)',
                fontWeight: 400, letterSpacing: '-0.02em', margin: 0,
              }}>
                {scenarioConfig.label}
              </h2>
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 36px', lineHeight: 1.6 }}>
              {scenarioTemplates.length} patterns — each backed by real high-scoring HN posts.
              Click one to start writing.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {scenarioTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t.id)}
                  style={{
                    background: 'var(--bg-elev)', border: '1px solid var(--rule)',
                    borderRadius: 12, padding: '18px 20px', textAlign: 'left',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'border-color 0.1s, box-shadow 0.1s',
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 16, alignItems: 'start',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = scenarioConfig.color
                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--rule)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div>
                    {/* Pattern */}
                    <p style={{ fontWeight: 600, fontSize: 14.5, margin: '0 0 10px', lineHeight: 1.5, color: 'var(--ink)' }}>
                      <PatternText pattern={t.pattern} values={{}} />
                    </p>

                    {/* Real examples */}
                    {t.examples?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {t.examples.slice(0, 2).map((ex, i) => (
                          <a key={i} href={ex.url} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              display: 'flex', alignItems: 'baseline', gap: 7,
                              textDecoration: 'none', fontSize: 12,
                            }}
                          >
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: scenarioConfig.color, flexShrink: 0 }}>
                              ▲{ex.score}
                            </span>
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
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      <span className="tag">{t.format}</span>
                      <span className="tag">{t.hook_type}</span>
                    </div>
                  </div>

                  {/* Score + arrow */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 12,
                      color: scenarioConfig.color, display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ fontSize: 10 }}>▲</span>{t.avg_score} avg
                    </div>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--bg-card)', border: '1px solid var(--rule-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: 'var(--ink-dim)',
                    }}>→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Fill details ── */}
        {step === 3 && selected && scenarioConfig && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Pattern card */}
            <div style={{
              background: 'var(--bg-elev)',
              border: `1.5px solid ${scenarioConfig.border}`,
              borderRadius: 12, padding: '20px 24px',
            }}>
              <div style={{ ...labelStyle, marginBottom: 10 }}>Selected pattern</div>
              <p style={{ fontWeight: 600, fontSize: 15.5, lineHeight: 1.55, margin: '0 0 12px', color: 'var(--ink)' }}>
                <PatternText pattern={selected.pattern} values={values} />
              </p>
              {/* Live preview */}
              {placeholders.some(k => values[k]) && (
                <div style={{
                  background: 'var(--bg-card)', borderRadius: 8, padding: '10px 14px',
                  fontSize: 13.5, color: 'var(--ink-dim)', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 12,
                }}>
                  <span style={{ ...labelStyle, fontStyle: 'normal', marginBottom: 4 }}>Preview</span>
                  {buildPreview()}
                </div>
              )}
              {/* Tip */}
              <div style={{
                padding: '9px 13px', background: scenarioConfig.bg,
                border: `1px solid ${scenarioConfig.border}`, borderRadius: 8,
                fontSize: 12.5, lineHeight: 1.55,
                color: scenarioConfig.color,
              }}>
                <strong>Tip: </strong>{selected.tips}
              </div>
            </div>

            {/* Placeholder inputs */}
            {placeholders.length > 0 && (
              <div>
                <div style={{ ...labelStyle, marginBottom: 16 }}>Fill in your details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {placeholders.map(key => (
                    <label key={key}>
                      <span style={labelStyle}>{formatLabel(key)}</span>
                      <input
                        type="text"
                        value={values[key] || ''}
                        onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                        placeholder={`e.g. ${key === 'product' ? 'my SaaS tool' : key === 'metric' ? '10k users' : key === 'timeframe' ? '3 months' : key}`}
                        style={inputStyle}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Product description */}
            <label>
              <span style={labelStyle}>Product description (for AI generation)</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does your product do? Who is it for? What problem does it solve? The more context, the better the output."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6 }}
              />
            </label>

            {/* Real examples */}
            {selected.examples?.length > 0 && (
              <div>
                <div style={labelStyle}>Real posts using this pattern</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selected.examples.map((ex, i) => (
                    <a key={i} href={ex.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'baseline', gap: 8, textDecoration: 'none',
                        padding: '8px 12px', background: 'var(--bg-elev)', borderRadius: 8,
                        border: '1px solid var(--rule)', transition: 'border-color 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--rule-strong)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--rule)')}
                    >
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: scenarioConfig.color, flexShrink: 0, minWidth: 44 }}>
                        ▲ {ex.score}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.4, flex: 1 }}>{ex.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => goStep(2)}
                style={{
                  background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)',
                  borderRadius: 10, padding: '11px 20px', fontSize: 14,
                  color: 'var(--ink-dim)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleGenerate}
                style={{
                  background: scenarioConfig.color, border: 'none',
                  borderRadius: 10, padding: '11px 28px', fontSize: 14,
                  fontWeight: 600, color: '#fff', cursor: 'pointer',
                  fontFamily: 'inherit', flex: 1,
                }}
              >
                Generate with AI →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Results ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {status === 'loading' && (
              <div style={{
                background: 'var(--bg-elev)', border: '1px solid var(--rule)',
                borderRadius: 14, padding: '64px 40px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
                  Generating your HN post…
                </div>
              </div>
            )}

            {status === 'error' && (
              <div style={{
                background: '#fff5f5', border: '1px solid #fecaca',
                borderRadius: 12, padding: '20px 24px', fontSize: 14, color: '#dc2626',
              }}>
                {result?.error || 'Something went wrong.'} Make sure ANTHROPIC_API_KEY is set.
              </div>
            )}

            {status === 'done' && result && (
              <>
                {/* Title variants */}
                <div>
                  <div style={labelStyle}>Choose a title ({result.titles?.length} variants)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.titles?.map((title, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTitle(i)}
                        style={{
                          textAlign: 'left', background: activeTitle === i ? (scenarioConfig?.bg ?? 'var(--accent-soft)') : 'var(--bg-elev)',
                          border: `1.5px solid ${activeTitle === i ? (scenarioConfig?.color ?? 'var(--accent)') : 'var(--rule)'}`,
                          borderRadius: 10, padding: '12px 16px', fontSize: 14,
                          lineHeight: 1.5, color: 'var(--ink)', cursor: 'pointer',
                          fontFamily: 'inherit', transition: 'all 0.1s',
                        }}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body */}
                {result.body && (
                  <div>
                    <div style={labelStyle}>Post body</div>
                    <div style={{
                      background: 'var(--bg-elev)', border: '1px solid var(--rule)',
                      borderRadius: 10, padding: '20px 22px', fontSize: 14,
                      lineHeight: 1.7, color: 'var(--ink-dim)', whiteSpace: 'pre-wrap',
                    }}>
                      {result.body}
                    </div>
                  </div>
                )}

                {/* Copy button */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => goStep(3)}
                    style={{
                      background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)',
                      borderRadius: 10, padding: '11px 20px', fontSize: 14,
                      color: 'var(--ink-dim)', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    ← Edit
                  </button>
                  <button
                    onClick={handleCopy}
                    style={{
                      background: copied ? '#059669' : 'var(--ink)',
                      border: 'none', borderRadius: 10, padding: '11px 28px',
                      fontSize: 14, fontWeight: 600, color: '#fff',
                      cursor: 'pointer', fontFamily: 'inherit', flex: 1,
                      transition: 'background 0.2s',
                    }}
                  >
                    {copied ? '✓ Copied' : 'Copy post'}
                  </button>
                </div>
              </>
            )}

            {/* Start over */}
            <button
              onClick={() => { setStep(1); setScenario(null); setSelectedId(null); setResult(null); setStatus('idle') }}
              style={{
                background: 'none', border: 'none', fontSize: 13,
                color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'inherit',
                textDecoration: 'underline', padding: 0, alignSelf: 'center',
              }}
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
