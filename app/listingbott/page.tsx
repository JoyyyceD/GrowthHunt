'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
type Goal = 'dr' | 'awareness'
type Status = 'idle' | 'loading' | 'success' | 'error'

// ── Sub-components ────────────────────────────────────────────────────────────
function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 400, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
        {num}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 20, paddingBottom: 32, borderBottom: '1px solid var(--rule)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', paddingTop: 4, flexShrink: 0, letterSpacing: '0.08em' }}>
        {n}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.6 }}>{body}</div>
      </div>
    </div>
  )
}

// ── Order form ────────────────────────────────────────────────────────────────
function OrderForm() {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [goal, setGoal] = useState<Goal>('dr')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrMsg('')

    try {
      const res = await fetch('/api/listingbott', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_url: url, product_name: name, description: desc, goal, contact_email: email }),
      })
      const data = await res.json()
      if (!res.ok) { setErrMsg(data.error ?? '提交失败'); setStatus('error'); return }
      setStatus('success')
    } catch {
      setErrMsg('网络错误，请重试')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 16, padding: '40px 36px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>✓</div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          订单已收到
        </h3>
        <p style={{ color: 'var(--ink-dim)', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
          我们将在 <strong style={{ color: 'var(--ink)' }}>1–2 个工作日内</strong>通过邮件联系你确认细节，然后正式启动目录提交。
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>确认邮件已发送至 {email}</p>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elev)',
    border: '1px solid var(--rule-strong)',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14,
    fontFamily: 'inherit',
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontFamily: 'var(--mono)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    marginBottom: 8,
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={labelStyle}>产品 URL *</label>
        <input
          style={inputStyle}
          type="url"
          placeholder="https://yourproduct.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
      </div>

      <div>
        <label style={labelStyle}>产品名称 *</label>
        <input
          style={inputStyle}
          type="text"
          placeholder="My Product"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          maxLength={100}
        />
      </div>

      <div>
        <label style={labelStyle}>产品简介（可选）</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80, lineHeight: 1.5 }}
          placeholder="一两句话介绍你的产品是什么、解决什么问题"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          maxLength={1000}
        />
      </div>

      <div>
        <label style={labelStyle}>提交目标 *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([['dr', '提升 Domain Rating', 'DR 从 0 涨到 15+，适合新站'], ['awareness', '品牌曝光', '覆盖更多垂直目录，带来精准流量']] as const).map(([val, title, sub]) => (
            <button
              key={val}
              type="button"
              onClick={() => setGoal(val)}
              style={{
                background: goal === val ? 'var(--accent-soft)' : 'var(--bg-elev)',
                border: `1.5px solid ${goal === val ? 'var(--accent)' : 'var(--rule-strong)'}`,
                borderRadius: 10,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: goal === val ? 'var(--accent)' : 'var(--ink)', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.4 }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>联系邮箱 *</label>
        <input
          style={inputStyle}
          type="email"
          placeholder="you@yourcompany.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>

      {status === 'error' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
          {errMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          background: status === 'loading' ? 'var(--ink-faint)' : 'var(--accent)',
          color: 'var(--accent-ink)',
          border: 'none',
          borderRadius: 999,
          padding: '14px 28px',
          fontSize: 14,
          fontWeight: 600,
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {status === 'loading' ? '提交中…' : '提交订单 →'}
      </button>

      <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0, lineHeight: 1.5 }}>
        提交后我们会在 1–2 个工作日内联系你确认细节。本服务消耗会员积分，积分系统上线后将自动扣除。
      </p>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ListingBottPage() {
  return (
    <div>
      {/* Nav */}
      <nav className="top">
        <div className="shell row">
          <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
            <div className="mark" />
            GrowthHunt
          </Link>
          <Link href="/" className="btn-line" style={{ fontSize: 13 }}>
            ← 所有工具
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '72px 0 56px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell">
          <div style={{ marginBottom: 16 }}>
            <span className="tag live" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>● Live now</span>
            <span className="tag" style={{ marginLeft: 8 }}>distribution</span>
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(48px, 7vw, 96px)', fontWeight: 400, lineHeight: 0.95, letterSpacing: '-0.035em', margin: '0 0 24px', maxWidth: 800 }}>
            100+ 目录提交，<em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>一键搞定</em>。
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink-dim)', maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
            手动提交目录要花 30–40 小时。ListingBott 替你自动提交 100+ 高质量目录，拿到真实外链，DR 两个月内从 0 涨到 15+。
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '48px 0', borderBottom: '1px solid var(--rule)', background: 'var(--bg-card)' }}>
        <div className="shell">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40 }}>
            <Stat num="100+" label="手动筛选的高质量目录" />
            <Stat num="30天" label="持续发布，人工节奏" />
            <Stat num="DR 15+" label="新站 2 个月内保证达成" />
            <Stat num="100M+" label="各目录月点击量" />
          </div>
        </div>
      </section>

      {/* Main grid: how it works + form */}
      <section style={{ padding: '80px 0' }}>
        <div className="shell">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>

            {/* Left: how it works */}
            <div>
              <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />工作流程</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Step
                  n="01"
                  title="提交你的产品"
                  body="填写产品 URL、名称、简介，选择目标（DR 提升 or 品牌曝光）。"
                />
                <Step
                  n="02"
                  title="我们准备清单（1–2天）"
                  body="根据你的目标，从 10,000+ 目录库中挑选最适合的 100 个目录。"
                />
                <Step
                  n="03"
                  title="自动发布（持续 1 个月）"
                  body="机器人每天分批提交，模拟人工节奏，规避批量提交风险。每周发送进度报告。"
                />
                <Step
                  n="04"
                  title="收到完整报告"
                  body="所有发布结果汇总成详细报告，含链接状态和收录情况。"
                />
                <div style={{ display: 'flex', gap: 20, paddingTop: 32 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', paddingTop: 4, flexShrink: 0, letterSpacing: '0.08em' }}>05</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>索引 & 外链生效（最长 2 个月）</div>
                    <div style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.6 }}>目录陆续被搜索引擎收录，DR 开始上涨。99% 的情况下 2 个月内完成。</div>
                  </div>
                </div>
              </div>

              {/* Guarantee */}
              <div style={{ marginTop: 40, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 8 }}>保证</div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
                  新站 DR 保证从 0 提升到 15。若未达成，继续操作直到达成，或全额退款。
                </p>
              </div>
            </div>

            {/* Right: form */}
            <div>
              <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />提交订单</div>
              <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule)', borderRadius: 16, padding: '32px' }}>
                <OrderForm />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '64px 0', borderTop: '1px solid var(--rule)', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ maxWidth: 720 }}>
          <div className="eyebrow" style={{ marginBottom: 32 }}><span className="dot" />常见问题</div>
          {[
            ['提交的都是什么类型的目录？', '手动筛选的 10,000+ 个目录，覆盖通用商业目录、AI 工具目录、SaaS 目录、创业社区等。每个目录都经过人工审核，确保真实有效。'],
            ['会不会触发搜索引擎惩罚？', '不会。所有提交分散在 30 天内完成，模拟自然节奏。所用目录均为真实、合规站点，不涉及 PBN 或链接农场。'],
            ['积分怎么扣？', '积分系统即将上线。目前提交订单后，我们会在联系你时确认积分详情。'],
            ['已有 DR 的网站能用吗？', '可以。DR 已经较高的站点可能涨幅小一些（+5–10），但依然能获得品牌曝光和精准流量。'],
          ].map(([q, a]) => (
            <div key={q} style={{ paddingBottom: 28, marginBottom: 28, borderBottom: '1px solid var(--rule)' }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{q}</div>
              <div style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.6 }}>{a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--rule)', padding: '24px 0', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'none' }}>← 所有工具</Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}
