import Link from 'next/link'

/**
 * Static magazine-style article. Server component (no client logic needed).
 * Styles defined inline at the bottom — same pattern as Lab.tsx.
 */
export default function PlaybookContent() {
  return (
    <>
      <header className="xh-pb-hero">
        <span className="xh-pb-wm">X</span>
        <div className="shell">
          <span className="xh-pb-badge">
            <span className="xh-pb-dot" />Growth Playbook · No. 01
          </span>
          <h1 className="xh-pb-h1">
            How AI startups <em>actually</em> go viral on X.
          </h1>
          <p className="xh-pb-sub">
            A pattern study of 326 viral tweets across 200+ AI companies — what archetypes win, what plays each stage runs, and what every category-defining account does that the dead ones don&apos;t.
          </p>
          <div className="xh-pb-meta">
            <div className="xh-pb-meta-item"><b>~14 min read</b></div>
            <div className="xh-pb-meta-item"><b>3,447 tweets analyzed</b></div>
            <div className="xh-pb-meta-item"><b>277 accounts</b></div>
            <div className="xh-pb-meta-item"><b>April 2026</b></div>
          </div>
        </div>
      </header>

      {/* 01 — Archetypes */}
      <section className="xh-pb-section">
        <div className="shell">
          <SectionHead num="01 / Archetypes" title="The 5 ways an AI startup tweet actually goes viral." subtitle="We classified 326 tweets that cleared 5,000 likes. Five archetypes covered the entire dataset. Master one of these — preferably the one that fits your account type and stage — before you write another marketing thread." />
          <div className="xh-pb-arch-table">
            <div className="xh-pb-arch-head">#</div>
            <div className="xh-pb-arch-head">Archetype</div>
            <div className="xh-pb-arch-head">Who runs it</div>
            <div className="xh-pb-arch-head">Why it works</div>

            {[
              ['01', 'The hot take from a credible founder', '@karpathy · @naval · @amasad', 'Personality + status + opinion. The product is implicit; the founder is the asset.'],
              ['02', 'The "Introducing X" with bold framing', '@perplexity_ai · @deepseek_ai · @cursor_ai', 'Big claim + clean visual + first-mover narrative. One sentence does the work of a thread.'],
              ['03', 'The build-in-public origin story', '@karpathy · @antonosika · @krandiash', 'Vulnerability + numbers + how-it-actually-happened. Compounds reader equity.'],
              ['04', 'The low-key demo (no fanfare)', '@hedra_labs · @v0 · @tldraw', '"Watch this work." Highest viral-rate-per-effort in the entire dataset.'],
              ['05', 'The reply-bait question', '@cursor_ai · @levelsio · @amasad', 'Algorithm rewards replies more than likes. Ask what your audience wants to argue about.'],
            ].map(([num, name, who, why]) => (
              <ArchRow key={num} num={num} name={name} who={who} why={why} />
            ))}
          </div>

          <blockquote className="xh-pb-bq" style={{ marginTop: 56 }}>
            Founders out-perform official accounts at the top end. The top 10 tweets from founder personal accounts have a higher floor than the top 10 from official company accounts — and the founder posts skew toward opinion and reflection, not product.
            <span className="xh-pb-attrib">— Headline finding</span>
          </blockquote>
        </div>
      </section>

      {/* 02 — By Stage */}
      <section className="xh-pb-section xh-pb-section-alt">
        <div className="shell">
          <SectionHead num="02 / By Stage" title="What works at $0 ARR is not what works at $100M." subtitle="Three stages, three different X playbooks. Most teams run the $100M-stage play (big launches, polished assets) at $0 ARR — when the audience for that doesn't exist yet." />
          <div className="xh-pb-stages">
            <Stage
              num="Stage 01" title="Pre-launch · Indie" arr="$0 — $1M ARR"
              lede="You are unknown. You have to win attention from cold."
              works={[
                'Build-in-public daily — short clip + one sentence + product mention',
                'Indie-maker positioning — collapse "we" into "I" and own the smallness',
                'Memes that double as positioning (the lifestyle flex)',
                'The 5-second demo, no copy, no thread — "look what this does"',
              ]}
              nope={[
                '"I\'m starting to build [thing]" — no one cares about intent, only output',
                'Long announcement threads with no demo — you have no permission yet',
                'Saying "we" when you are one person',
              ]}
            />
            <Stage
              num="Stage 02" title="Breakout" arr="$1M — $10M ARR"
              lede="You have proof but not fame. Now stories scale."
              works={[
                "The raise tweet, told as origin (Anton Osika's Lovable post: 14K likes)",
                'Customer-result tweets with names + screenshots — specific > generic',
                'Numbers + tasteful screenshot — institutional credibility cascades',
                'Transparency posts — share the MRR, the breakdown, the chart',
              ]}
              nope={[
                'Hiding revenue — if you have a number, the number is the leverage',
                'Polished case studies in a deck format — they read as marketing',
              ]}
            />
            <Stage
              num="Stage 03" title="Scale" arr="$10M — $100M+ ARR"
              lede="You have brand. Now you fight for cultural relevance."
              works={[
                'The opinionated launch — "Introducing Perplexity Computer" (47K likes, 38M views)',
                "Open-source the artifact alongside the announcement — DeepSeek's playbook",
                'The competitor-tag — Kimi/Moonshot tagging Cursor, positively (20K likes)',
                'The athlete/celebrity loop — WHOOP × Cristiano (3 of top 3 hardware tweets)',
              ]}
              nope={[
                'Generic "we\'re #1 at X" — the audience has heard it from every competitor',
                'Long company-anniversary threads — save them for the blog',
              ]}
            />
          </div>
        </div>
      </section>

      {/* 03 — Channel Mix */}
      <section className="xh-pb-section">
        <div className="shell">
          <SectionHead num="03 / Channel Mix" title="Founder vs official — a clear division of labor." subtitle="The most consistent failure mode in the dataset: founders posting product copy, official accounts posting jokes. Both feel inauthentic." />
          <div className="xh-pb-mix-grid">
            <Mix icon="𝓕" title="The founder hot take" tag="Founder · Hot take" desc="2-word zingers, aphorisms, observations about the world. Karpathy and Naval combined hold 8 of the top 10 founder slots — and zero of those tweets are about their products." stat="57,761 likes — Karpathy's LLM Knowledge Bases" />
            <Mix icon="𝓛" title="The category-claim launch" tag="Official · Launch" desc="One-line announcement. Bold visual. Category-implying name (not 'a feature' — 'Perplexity Computer,' as in the computer)." stat={'46,956 likes — "Introducing Perplexity Computer"'} />
            <Mix icon="𝓑" title="The build-in-public story" tag="Founder · BTS" desc='"This started unexpectedly when I called my friend at..." Origin stories that lead with the number, then immediately switch register to scene.' stat="13,974 likes — Anton Osika announces Lovable's $200M raise" />
            <Mix icon="𝓓" title="The low-key demo" tag="Official · Demo" desc="5–30 second clip. No 'introducing.' No thread. Just the product visibly working, sometimes mentioning a competitor by name to position itself." stat={'21,549 likes — Hedra\'s "ChatGPT image + Hedra video" demo'} />
            <Mix icon="𝓡" title="The reply-bait question" tag="Both · Engagement" desc="Direct question your audience has an opinion on. Replies are weighted heavier than likes by the algorithm — 200 replies often out-performs 1000 likes." stat={'15,448 likes — Cursor: "We\'re curious to hear what you think."'} />
            <Mix icon="𝓜" title="The meme (founders only)" tag="Founder · Meme" desc="In the entire dataset, zero official-account memes broke 5K likes. Corporate humor reads as try-hard. Founders can be weird; companies almost never can." stat="22,437 likes — Karpathy's TV-90s vs TV-2025 rant" />
          </div>
        </div>
      </section>

      {/* 04 — Synthesis */}
      <section className="xh-pb-section xh-pb-section-alt">
        <div className="xh-pb-shell-narrow">
          <SectionHead num="04 / Synthesis" title="The single biggest takeaway: the founder is still the moat." subtitle="Here's the thesis the data forced us into." />
          <div className="xh-pb-prose">
            <p>If you scroll the top 50 viral tweets in this dataset by absolute likes, the surprising thing isn&apos;t the products. It&apos;s the cadence. <b>Personal accounts dominate the top end.</b> Karpathy alone has 4 tweets above 24K likes. Naval has 4. Amjad Masad has 2. The official accounts that match this volume — Perplexity, DeepSeek, Cursor — are doing it through <em>category-defining</em> launches, not sustainable cadence. They get one or two giant tweets per quarter. Founders get one or two per <em>week</em>.</p>

            <p>What this means in practice: if you&apos;re starting from zero today, the lever is the founder account, not the official account. The official is the megaphone you pick up on launch days. The founder is the relationship you build every other day of the year.</p>

            <blockquote className="xh-pb-bq">
              The top 10 founder tweets in the dataset contain zero product announcements. Not one. The founder account is where you are a <i>person</i> on X — opinions, observations, half-formed thoughts, jokes. The minute you turn it into a marketing channel, you lose the asset that makes it valuable.
            </blockquote>

            <p>This is the part most teams fail. They get the official account&apos;s tone right (clean, professional, demo-forward), then accidentally clone that same tone onto the founder&apos;s personal handle — and the founder account dies. It dies politely, with 80 likes per post, while the team wonders why it&apos;s not &quot;moving the needle.&quot; It&apos;s not moving the needle because it&apos;s been demoted into a smaller, lower-quality megaphone instead of a different category of asset.</p>

            <h3>The Karpathy/Naval blueprint</h3>
            <p>If you want to model what a top-tier founder account looks like, the recipe across both is identical:</p>
            <p style={{ paddingLeft: 28 }}>
              <b>1.</b> Read widely.<br />
              <b>2.</b> Notice things others haven&apos;t compressed yet.<br />
              <b>3.</b> Compress the observation into one screen.<br />
              <b>4.</b> Don&apos;t link to anything (the link is the cost; the take is the value).<br />
              <b>5.</b> Repeat 3–7×/week.
            </p>
          </div>
        </div>
      </section>

      {/* 05 — Principles */}
      <section className="xh-pb-section">
        <div className="shell">
          <SectionHead num="05 / Principles" title="Six laws that hold across every category." subtitle="After staring at 326 viral tweets, six principles emerged that don't fit neatly into any one bucket but apply universally." />
          <ol className="xh-pb-principles">
            <Principle title="Brevity is the dominant predictor.">
              Half of the top 10 founder tweets are under 20 words. &quot;Legalize noticing!&quot; — 2 words, 54K likes. &quot;A good haircut&quot; — 3 words, 41K likes. The X algorithm and reader attention both reward distillation.
            </Principle>
            <Principle title="Specificity beats grandeur.">
              &quot;$100M ARR in 8 months&quot; works. &quot;We&apos;re growing fast&quot; doesn&apos;t. &quot;@Cristiano&apos;s biomarkers reveal...&quot; works. &quot;Top athletes use WHOOP&quot; doesn&apos;t. Every viral tweet has at least one specific noun a search engine could index.
            </Principle>
            <Principle title="Demos > descriptions.">
              If your product makes something, <i>show</i> the thing. The cost of producing a demo tweet has collapsed; the reward hasn&apos;t. One demo tweet per week, minimum, if you ship anything visual.
            </Principle>
            <Principle title="Tag adjacent products positively.">
              Kimi tagged Cursor. Hedra mentioned ChatGPT. Cursor tags Anthropic and OpenAI. Adjacency to a bigger gravity well borrows reach. Co-celebrate, don&apos;t snipe.
            </Principle>
            <Principle title="Post about the world, not your product.">
              The Karpathy formula: notice something happening in tech, write 100 words about it, ship. The product is implicit. You earn the right to advertise by being the kind of account people read for non-advertisement.
            </Principle>
            <Principle title="Test the screenshot.">
              Would the post still work if you screenshot just the text and removed your brand? If yes, it&apos;s viral-able. If no, it&apos;s marketing — and marketing tweets have a hard ceiling around 2K likes.
            </Principle>
          </ol>
        </div>
      </section>

      {/* 06 — Roadmap */}
      <section className="xh-pb-section xh-pb-section-alt">
        <div className="shell">
          <SectionHead num="06 / Roadmap" title="The 12-month playbook, compressed." subtitle="If we were starting an AI company tomorrow, here's what we'd do on X — week by week, month by month." />
          <div className="xh-pb-roadmap">
            <Step when="Week 1" title="Set the foundation." items={[
              'Set up the founder account. Real name, real face, current company in bio.',
              "Set up the official account. Make it look credible. Don't post yet.",
              'Find 50 people doing what you\'d consider "good X" in your space. Follow them. Read for 7 days.',
            ]} />
            <Step when="Weeks 2–4" title="Find your voice." items={[
              'Post 2× per day on the founder account. Mix: 1 observation, 1 small product update.',
              "Don't worry about engagement. You're learning your voice.",
              'Anything over 100 likes — note what you did. Repeat next week.',
            ]} />
            <Step when="Months 2–6" title="Scale cadence." items={[
              'Founder account → 4–7×/week. Demos, observations, takes, occasional jokes.',
              'Official account starts posting. 3×/week. Mostly demos and customer wins.',
              'One low-key demo tweet per week minimum. Highest viral-rate-per-effort.',
              'Start tagging adjacent companies positively.',
            ]} />
            <Step when="Months 6–12" title="Compound." items={[
              'Hit a real number? ($100K MRR, 10K users, $X raise.) Tweet from the founder first.',
              'Find a celebrity / power user. Get a screenshot. Post it.',
              "One \"we built X, here's how it actually came together\" thread per quarter.",
              'By month 12: the founder account is the moat. Audit and refresh quarterly.',
            ]} />
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: pbStyles }} />
    </>
  )
}

function SectionHead({ num, title, subtitle }: { num: string; title: string; subtitle: string }) {
  return (
    <div className="xh-pb-section-head">
      <div className="xh-pb-section-num">{num}</div>
      <div className="xh-pb-section-title">
        <h2 className="xh-pb-h2">{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}

function ArchRow({ num, name, who, why }: { num: string; name: string; who: string; why: string }) {
  return (
    <>
      <div className="xh-pb-arch-num">{num}</div>
      <div className="xh-pb-arch-name">{name}</div>
      <div className="xh-pb-arch-who">{who}</div>
      <div className="xh-pb-arch-why">{why}</div>
    </>
  )
}

function Stage({
  num, title, arr, lede, works, nope,
}: {
  num: string; title: string; arr: string; lede: string; works: string[]; nope: string[]
}) {
  return (
    <div className="xh-pb-stage">
      <div className="xh-pb-stage-num">{num}</div>
      <h3 className="xh-pb-stage-h">{title}</h3>
      <div className="xh-pb-stage-arr">{arr}</div>
      <p className="xh-pb-stage-lede">&ldquo;{lede}&rdquo;</p>
      <div className="xh-pb-stage-label">What works</div>
      <ul className="xh-pb-checklist">
        {works.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
      <div className="xh-pb-stage-label" style={{ marginTop: 8 }}>What doesn&apos;t</div>
      <ul className="xh-pb-checklist xh-pb-nope">
        {nope.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  )
}

function Mix({ icon, title, tag, desc, stat }: { icon: string; title: string; tag: string; desc: string; stat: string }) {
  return (
    <div className="xh-pb-mix">
      <div className="xh-pb-mix-icon">{icon}</div>
      <h4 className="xh-pb-mix-h">{title}</h4>
      <span className="xh-pb-mix-tag">{tag}</span>
      <p className="xh-pb-mix-desc">{desc}</p>
      <div className="xh-pb-mix-stat">{stat}</div>
    </div>
  )
}

function Principle({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li>
      <h4>{title}</h4>
      <p>{children}</p>
    </li>
  )
}

function Step({ when, title, items }: { when: string; title: string; items: string[] }) {
  return (
    <div className="xh-pb-step">
      <div className="xh-pb-step-when">{when}</div>
      <h4 className="xh-pb-step-h">{title}</h4>
      <ul>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  )
}

const pbStyles = `
.xh-pb-shell-narrow { max-width: 760px; margin: 0 auto; padding: 0 32px; }

.xh-pb-hero {
  padding: 96px 0 64px;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--rule);
}
.xh-pb-wm {
  position: absolute;
  font-family: var(--serif);
  font-style: italic;
  font-size: 38vw;
  line-height: 0.8;
  color: rgba(232, 78, 27, 0.04);
  top: -10vw; right: -8vw;
  pointer-events: none; user-select: none;
}
.xh-pb-badge {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 6px 14px;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  background: var(--bg-elev);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-dim);
  margin-bottom: 36px;
}
.xh-pb-dot {
  width: 7px; height: 7px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(232,78,27,0.22);
}
.xh-pb-h1 {
  font-family: var(--serif);
  font-size: clamp(48px, 6.5vw, 88px);
  line-height: 0.98;
  letter-spacing: -0.032em;
  font-weight: 400;
  margin-bottom: 18px;
  max-width: 920px;
}
.xh-pb-h1 em { font-style: italic; color: var(--accent); }
.xh-pb-sub {
  font-family: var(--serif);
  font-size: clamp(22px, 2.4vw, 32px);
  line-height: 1.25;
  color: var(--ink-dim);
  font-style: italic;
  max-width: 760px;
  margin-bottom: 36px;
}
.xh-pb-meta {
  display: flex; gap: 28px; flex-wrap: wrap;
  padding-top: 28px;
  border-top: 1px solid var(--rule);
}
.xh-pb-meta-item {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--ink-faint);
  text-transform: uppercase;
}
.xh-pb-meta-item b { color: var(--ink); font-weight: 500; margin-right: 6px; }

.xh-pb-section { padding: 80px 0 32px; }
.xh-pb-section-alt {
  background: #f7f5f0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}
.xh-pb-section-head {
  display: grid; grid-template-columns: 80px 1fr;
  gap: 32px; align-items: baseline;
  margin-bottom: 48px; padding-bottom: 24px;
  border-bottom: 1px solid var(--rule);
}
.xh-pb-section-num {
  font-family: var(--mono); font-size: 13px;
  letter-spacing: 0.16em; color: var(--accent); font-weight: 500;
  padding-top: 14px;
}
.xh-pb-h2 {
  font-family: var(--serif);
  font-size: clamp(36px, 4vw, 56px);
  line-height: 1.05; letter-spacing: -0.024em; font-weight: 400;
  margin-bottom: 12px;
}
.xh-pb-section-title p {
  font-size: 16px; color: var(--ink-dim); max-width: 640px; line-height: 1.55;
}

/* Archetypes table */
.xh-pb-arch-table {
  display: grid; grid-template-columns: 28px 1fr 1.4fr 1.6fr;
  border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
}
.xh-pb-arch-table > div {
  padding: 22px 16px;
  border-bottom: 1px solid var(--rule);
}
.xh-pb-arch-table > div:nth-last-child(-n+4) { border-bottom: none; }
.xh-pb-arch-head {
  background: var(--bg-card);
  font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-dim);
  padding-top: 14px; padding-bottom: 14px;
}
.xh-pb-arch-num {
  font-family: var(--mono); font-size: 13px;
  color: var(--accent); font-weight: 500;
}
.xh-pb-arch-name {
  font-family: var(--serif); font-size: 19px;
  letter-spacing: -0.01em;
}
.xh-pb-arch-who {
  font-family: var(--mono); font-size: 12px;
  color: var(--ink-dim); letter-spacing: 0.02em;
}
.xh-pb-arch-why { font-size: 14px; color: var(--ink); line-height: 1.5; }

/* Stage cards */
.xh-pb-stages {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
}
.xh-pb-stage {
  background: var(--bg-elev);
  border: 1px solid var(--rule);
  border-radius: 12px;
  padding: 28px 26px;
  display: flex; flex-direction: column;
}
.xh-pb-stage-num {
  font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.14em; color: var(--accent);
  text-transform: uppercase; margin-bottom: 18px;
}
.xh-pb-stage-h {
  font-family: var(--serif); font-size: 28px;
  line-height: 1.1; letter-spacing: -0.018em;
  font-weight: 400; margin-bottom: 6px;
}
.xh-pb-stage-arr {
  font-family: var(--mono); font-size: 12px;
  color: var(--ink-faint); letter-spacing: 0.04em;
  text-transform: uppercase; margin-bottom: 24px;
  padding-bottom: 18px; border-bottom: 1px solid var(--rule);
}
.xh-pb-stage-lede {
  font-size: 15px; color: var(--ink); line-height: 1.55;
  font-style: italic; margin-bottom: 22px;
}
.xh-pb-stage-label {
  font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-faint); margin-bottom: 12px;
}
.xh-pb-checklist {
  list-style: none; display: flex; flex-direction: column;
  gap: 11px; margin-bottom: 18px; padding: 0;
}
.xh-pb-checklist li {
  font-size: 14px; color: var(--ink); line-height: 1.5;
  padding-left: 22px; position: relative;
}
.xh-pb-checklist li::before {
  content: '✓'; position: absolute; left: 0; top: 0;
  font-family: var(--mono); font-weight: 600; color: #0f7a6e;
}
.xh-pb-nope li::before { content: '✗'; color: var(--accent); }

/* Mix cards */
.xh-pb-mix-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
}
.xh-pb-mix {
  background: var(--bg-elev); border: 1px solid var(--rule);
  border-radius: 12px; padding: 26px 24px;
  display: flex; flex-direction: column;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.xh-pb-mix:hover {
  border-color: var(--rule-strong);
  box-shadow: 0 12px 32px rgba(20,17,13,0.05);
}
.xh-pb-mix-icon {
  font-family: var(--serif); font-style: italic;
  font-size: 36px; line-height: 1; color: var(--accent);
  margin-bottom: 18px;
}
.xh-pb-mix-h {
  font-family: var(--serif); font-size: 22px;
  line-height: 1.15; letter-spacing: -0.014em;
  font-weight: 400; margin-bottom: 8px;
}
.xh-pb-mix-tag {
  display: inline-block;
  font-family: var(--mono); font-size: 10px;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--accent); background: var(--accent-soft);
  padding: 3px 8px; border-radius: 4px; margin-bottom: 14px;
}
.xh-pb-mix-desc {
  font-size: 14px; color: var(--ink-dim);
  line-height: 1.55; margin-bottom: 18px;
}
.xh-pb-mix-stat {
  margin-top: auto; padding-top: 14px;
  border-top: 1px solid var(--rule);
  font-family: var(--mono); font-size: 11px;
  color: var(--ink-faint); letter-spacing: 0.04em;
}

/* Prose */
.xh-pb-prose {
  font-size: 17px; line-height: 1.65; color: var(--ink);
}
.xh-pb-prose p { margin-bottom: 24px; }
.xh-pb-prose b, .xh-pb-prose strong { font-weight: 600; }
.xh-pb-prose h3 {
  font-family: var(--serif); font-size: 28px;
  line-height: 1.2; letter-spacing: -0.014em;
  font-weight: 400; margin: 48px 0 16px;
}
.xh-pb-prose h3 em { font-style: italic; color: var(--accent); }

.xh-pb-bq {
  border-left: 3px solid var(--accent);
  padding: 4px 0 4px 24px;
  margin: 32px 0;
  font-family: var(--serif); font-style: italic;
  font-size: 22px; line-height: 1.4; color: var(--ink);
}
.xh-pb-attrib {
  display: block;
  font-family: var(--mono); font-style: normal;
  font-size: 11px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-faint);
  margin-top: 10px;
}

/* Principles */
.xh-pb-principles {
  list-style: none; counter-reset: p;
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 14px; padding: 0;
}
.xh-pb-principles li {
  counter-increment: p;
  background: var(--bg-elev);
  border: 1px solid var(--rule);
  border-radius: 10px;
  padding: 24px 26px;
  display: flex; flex-direction: column; gap: 10px;
}
.xh-pb-principles li::before {
  content: '0' counter(p);
  font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.16em; color: var(--accent);
  font-weight: 500;
}
.xh-pb-principles li h4 {
  font-family: var(--serif); font-size: 22px;
  line-height: 1.2; letter-spacing: -0.014em;
  font-weight: 400;
}
.xh-pb-principles li p {
  font-size: 14px; line-height: 1.55; color: var(--ink-dim);
}

/* Roadmap */
.xh-pb-roadmap {
  display: grid; grid-template-columns: repeat(4, 1fr);
}
.xh-pb-step {
  padding: 30px 24px;
  border-right: 1px solid var(--rule);
  background: var(--bg-elev);
}
.xh-pb-step:last-child { border-right: none; }
.xh-pb-step-when {
  font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 12px;
}
.xh-pb-step-h {
  font-family: var(--serif); font-size: 22px;
  line-height: 1.15; letter-spacing: -0.014em;
  font-weight: 400; margin-bottom: 14px;
}
.xh-pb-step ul {
  list-style: none; display: flex; flex-direction: column;
  gap: 9px; padding: 0;
}
.xh-pb-step ul li {
  font-size: 13px; line-height: 1.5; color: var(--ink);
  padding-left: 14px; position: relative;
}
.xh-pb-step ul li::before {
  content: '·'; position: absolute; left: 0;
  color: var(--accent); font-weight: 700;
}

/* Bottom CTA */
.xh-pb-bottom-cta {
  background: var(--ink); color: var(--bg);
  padding: 64px 0; margin-top: 80px;
}
.xh-pb-cta-h {
  font-family: var(--serif);
  font-size: clamp(28px, 3.4vw, 44px);
  line-height: 1.1; letter-spacing: -0.02em;
  font-weight: 400; margin-bottom: 14px;
}
.xh-pb-cta-h em { font-style: italic; color: var(--accent); }
.xh-pb-cta-sub {
  color: rgba(255,255,255,0.65);
  font-size: 16px; line-height: 1.55;
  max-width: 680px; margin-bottom: 30px;
}
.xh-pb-cta-btn {
  display: inline-flex; align-items: center; gap: 10px;
  background: var(--accent); color: var(--accent-ink);
  padding: 14px 28px; border-radius: 999px;
  font-family: var(--sans); font-size: 15px; font-weight: 500;
  transition: opacity 0.15s;
}
.xh-pb-cta-btn:hover { opacity: 0.92; }

@media (max-width: 920px) {
  .xh-pb-stages, .xh-pb-mix-grid { grid-template-columns: 1fr; }
  .xh-pb-principles { grid-template-columns: 1fr; }
  .xh-pb-roadmap { grid-template-columns: 1fr; }
  .xh-pb-step { border-right: none; border-bottom: 1px solid var(--rule); }
  .xh-pb-arch-table { grid-template-columns: 28px 1fr; }
  .xh-pb-arch-head:nth-child(3),
  .xh-pb-arch-head:nth-child(4),
  .xh-pb-arch-who, .xh-pb-arch-why { display: none; }
  .xh-pb-section-head { grid-template-columns: 1fr; gap: 8px; }
}
@media (max-width: 600px) {
  .xh-pb-shell-narrow { padding: 0 20px; }
  .xh-pb-hero { padding: 64px 0 48px; }
  .xh-pb-section { padding: 56px 0 24px; }
}
`
