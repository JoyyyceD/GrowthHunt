import type { Feature } from './features'

function MockFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="mock">
      <div className="mock-header">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span className="url mono">{url}</span>
      </div>
      <div className="mock-body">{children}</div>
    </div>
  )
}

function MockCreatorList({ rows }: { rows: { av: string; name: string; meta: string; score: string }[] }) {
  return (
    <div>
      {rows.map((r, i) => (
        <div className="mock-row" key={i}>
          <div className="av">{r.av}</div>
          <div className="col">
            <div className="name">{r.name}</div>
            <div className="meta-line">{r.meta}</div>
          </div>
          <div className="stat">{r.score}</div>
        </div>
      ))}
    </div>
  )
}

function MockPainCluster({ items }: { items: { quote: string; cluster: string; count: number }[] }) {
  return (
    <div>
      {items.map((q, i) => (
        <div key={i} style={{ padding: '12px 0', borderBottom: i < items.length - 1 ? '1px solid var(--rule)' : 'none' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.3, fontStyle: 'italic', marginBottom: 6 }}>
            &ldquo;{q.quote}&rdquo;
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {q.cluster} · {q.count} similar
          </div>
        </div>
      ))}
    </div>
  )
}

function MockPipeline() {
  const cols = [
    { name: 'Prospect', items: ['@mkbhd', '@fireship', '@theo'] },
    { name: 'Replied', items: ['@swyx', '@dansvet'] },
    { name: 'Live', items: ['@levelsio'] },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {cols.map(c => (
        <div key={c.name} style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 8, padding: 10 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
            {c.name} · {c.items.length}
          </div>
          {c.items.map(item => (
            <div key={item} style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule)', borderRadius: 6, padding: '8px 10px', marginBottom: 6, fontSize: 12 }}>
              {item}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function MockEmail({ to, subject, body }: { to: string; subject: string; body: string[] }) {
  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6 }}>
      <div style={{ borderBottom: '1px solid var(--rule)', paddingBottom: 10, marginBottom: 12, color: 'var(--ink-faint)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '.08em' }}>
        TO {to} · SUBJECT {subject}
      </div>
      <div style={{ color: 'var(--ink-dim)' }}>
        {body.map((line, i) => <p key={i} style={{ margin: '0 0 10px' }}>{line}</p>)}
      </div>
    </div>
  )
}

function MockBars({ data }: { data: number[] }) {
  return (
    <div className="chart-bars">
      {data.map((v, i) => (
        <div key={i} className={`bar ${v < 30 ? 'muted' : ''}`} style={{ height: `${v}%` }} />
      ))}
    </div>
  )
}

function MockAlert() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 8, marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
        <div style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
          <span style={{ color: 'var(--accent)' }}>NEW · 14s ago</span> · @indiehacker_jen on r/SaaS
        </div>
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.35, fontStyle: 'italic', color: 'var(--ink)', marginBottom: 12 }}>
        &ldquo;GrowthHunt&apos;s just dropped the most ambitious GTM tool I&apos;ve seen this year&rdquo;
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 11, flexWrap: 'wrap' }}>
        <span className="tag">DRAFT REPLY ↗</span>
        <span className="tag live">+0.81 SENTIMENT</span>
      </div>
    </div>
  )
}

function MockPattern() {
  return (
    <div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1.2, marginBottom: 16 }}>
        Indie devs · 30–80k subs · weekly cadence
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'ROI', value: '4.1×', accent: true },
          { label: 'WIN RATE', value: '52%', accent: false },
          { label: 'CLOSED', value: '23', accent: false },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 8 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div className="serif" style={{ fontSize: 28, color: s.accent ? 'var(--accent)' : 'var(--ink)' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <MockBars data={[20, 35, 45, 30, 60, 75, 85, 70, 90]} />
    </div>
  )
}

const CREATOR_ROWS = [
  { av: 'M', name: '@marquesbrownlee', meta: '18.4M · tech reviewer · 84% fit', score: '0.94' },
  { av: 'F', name: '@fireship_io',     meta: '3.1M · dev tools · 91% fit',       score: '0.91' },
  { av: 'T', name: '@theo',            meta: '420k · saas builder · 88% fit',     score: '0.88' },
  { av: 'L', name: '@levelsio',        meta: '610k · indie hacker · 86% fit',     score: '0.86' },
  { av: 'S', name: '@swyx',            meta: '105k · ai eng · 82% fit',           score: '0.82' },
]

export function MockFor({ feature }: { feature: Feature }) {
  const { id } = feature

  if (id === 'reddit-pain') {
    return (
      <MockFrame url="reddit-pain.growthhunt.ai">
        <MockPainCluster items={[
          { quote: "Toggl literally crashes if I look at it wrong", cluster: 'reliability', count: 47 },
          { quote: "I just want a tracker that doesn't need 14 settings", cluster: 'simplicity', count: 31 },
          { quote: "Why does pricing change every 4 months", cluster: 'pricing', count: 22 },
        ]} />
      </MockFrame>
    )
  }

  if (['youtube-find', 'instagram-find', 'tiktok-find', 'similar-creator', 'twitter-find', 'rival-creators'].includes(id)) {
    return (
      <MockFrame url={`${id}.growthhunt.ai`}>
        <MockCreatorList rows={CREATOR_ROWS} />
      </MockFrame>
    )
  }

  if (['pitch-gen', 'email-seq', 'instagram-dm', 'twitter-dm', 'whatsapp'].includes(id)) {
    return (
      <MockFrame url="outreach.growthhunt.ai">
        <MockEmail
          to="@fireship_io"
          subject="Loved your Bun video — quick thought"
          body={[
            'Hey Jeff,',
            "Saw your \"100 seconds of Bun\" hit a million in 8 days — the framing of \"imagine if Node was actually fast\" is the cleanest dev-tool pitch I've seen all year.",
            "I'm building GrowthHunt — a GTM agent for indie devs. Same audience that got you to a million.",
            'Open to a 15-min call next week?',
          ]}
        />
      </MockFrame>
    )
  }

  if (id === 'pipeline') {
    return <MockFrame url="pipeline.growthhunt.ai"><MockPipeline /></MockFrame>
  }

  if (id === 'pattern-find') {
    return <MockFrame url="patterns.growthhunt.ai"><MockPattern /></MockFrame>
  }

  if (id === 'keyword-alert' || id === 'reddit-monitor') {
    return <MockFrame url="watch.growthhunt.ai"><MockAlert /></MockFrame>
  }

  if (id === 'reply-track') {
    return (
      <MockFrame url="replies.growthhunt.ai">
        <MockBars data={[40, 55, 70, 45, 80, 65, 90, 75, 60, 85]} />
        <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 12 }}>
          <div><span className="mono" style={{ color: 'var(--ink-faint)' }}>SENT</span> <b>142</b></div>
          <div><span className="mono" style={{ color: 'var(--ink-faint)' }}>REPLIED</span> <b style={{ color: 'var(--accent)' }}>38 (27%)</b></div>
          <div><span className="mono" style={{ color: 'var(--ink-faint)' }}>BOOKED</span> <b>9</b></div>
        </div>
      </MockFrame>
    )
  }

  if (id === 'get-backlinks') {
    return (
      <MockFrame url="growthhunt.ai/get-backlinks">
        <div>
          {['Product Hunt', 'BetaList', 'Hacker News', 'IndieHackers', 'SaaSHub', 'AlternativeTo', 'StartupBase'].map((d, i) => (
            <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--rule)', fontSize: 13 }}>
              <span>{d}</span>
              <span className="mono" style={{ fontSize: 11, color: i < 4 ? 'var(--accent)' : 'var(--warn)' }}>
                {i < 4 ? '✓ LIVE' : i < 6 ? '⏳ QUEUED' : '○ PENDING'}
              </span>
            </div>
          ))}
        </div>
      </MockFrame>
    )
  }

  // Default
  return (
    <MockFrame url={`${id}.growthhunt.ai`}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1.3, marginBottom: 16, fontStyle: 'italic' }}>
        &ldquo;{feature.hook}&rdquo;
      </div>
      <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: 14, fontFamily: 'var(--mono)', fontSize: 12 }}>
        <div style={{ color: 'var(--ink-faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>EXAMPLE OUTPUT</div>
        <div style={{ color: 'var(--accent)' }}>→ {feature.example.output}</div>
      </div>
    </MockFrame>
  )
}
