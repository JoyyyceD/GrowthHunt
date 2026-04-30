// One-shot SEO frontmatter rewrite for growth-stories.
// Replaces only `title` and `description` lines in each index.mdx; leaves body untouched.

import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('content/growth-stories')

const updates = {
  anthropic: {
    title: 'How Anthropic Grew to $30B ARR: The Complete Growth Story',
    description: 'How seven OpenAI researchers built a $30B ARR company in 5 years. Safety as reverse positioning, the most surgical funding cadence in AI.',
  },
  'character-ai': {
    title: 'Character.AI Growth Story: From $1B Unicorn to $2.7B Acqui-hire',
    description: 'From a $1B chatbot unicorn to a $2.7B reverse-acquihire in 32 months. Engagement no consumer AI has matched, monetization that never caught up.',
  },
  cursor: {
    title: 'How Cursor Got to $1B ARR in 13 Months: Growth Teardown',
    description: 'From VS Code fork to $29B in 24 months. The first 22 months stayed flat — the curve only went vertical after October 2024. Here\'s exactly why.',
  },
  elevenlabs: {
    title: 'How ElevenLabs Grew to $11B in 46 Months: Growth Story',
    description: 'From a stealth London flat to an $11B voice-AI platform in 46 months. Two scandals, three model generations, four bundled rounds compressed the curve.',
  },
  gamma: {
    title: 'How Gamma Got 3M Users in 3 Months: AI Growth Story',
    description: '60K to 3M users in 3 months after a March 2023 GPT integration — and Gamma stayed small enough to be profitable through every round after.',
  },
  genspark: {
    title: 'Genspark Growth Story: $200M ARR in 11 Months After a Pivot',
    description: 'Day 0: $60M pre-revenue seed. Month 9: pivoted away from 5M users. Month 20: $200M+ run rate. The clearest forced-pivot case in the AI cohort.',
  },
  'hugging-face': {
    title: 'How Hugging Face Became the GitHub of AI: Growth Story',
    description: 'From a failed teen chatbot to the GitHub of AI. 7.5 years of academic-community substrate compounding into the most diversified investor stack in AI.',
  },
  humane: {
    title: 'Humane AI Pin: A $230M Failure Postmortem (Growth Story)',
    description: 'Two ex-Apple founders, $230M, five stealth years, a TED stage — and a launch the substrate couldn\'t absorb. The canonical AI hardware failure.',
  },
  jasper: {
    title: 'How Jasper Lost to ChatGPT: $1.5B AI Wrapper Postmortem',
    description: 'From a $1.5B Series A to ChatGPT killing it in 43 days. Textbook GTM didn\'t save Jasper from a wrapper-on-GPT-3 moat. The cleanest D1 failure on record.',
  },
  linear: {
    title: 'How Linear Grew to $100M ARR With $35K in Marketing Spend',
    description: 'Six years of anti-Jira reverse positioning. $35K total marketing spend. ~$100M ARR on $134M raised. The cleanest design-led capital-efficiency case in B2B SaaS.',
  },
  lovable: {
    title: 'How Lovable Hit $400M ARR in 15 Months: Growth Playbook',
    description: 'From a 50K-star repo and two failed launches to $400M ARR in 15 months. The inverse of the standard SaaS curve — a pre-built audience that detonated on rebrand.',
  },
  manus: {
    title: 'Manus Growth Story: 2M Waitlist in One Demo, $100M ARR',
    description: 'A 2-min demo on March 6 pulled 2M people onto a waitlist. Nine months later: $100M ARR and a $2B Meta deal. Then China killed it. Almost none of this is luck.',
  },
  notion: {
    title: 'How Notion Grew: A 13-Year Thesis and the AI Pricing Bet',
    description: 'Six years of pre-PMF wandering on a 13-year thesis. Then AI bolted on as a feature, not a transformation. The May 2025 pricing change reveals the limit of the bet.',
  },
  oura: {
    title: 'How Oura Ring Grew to $11B: A 13-Year Health Platform Story',
    description: '13 years from a Kickstarter ring in Oulu to an $11B health platform. Seven quiet years, the NBA bubble, then a subscription pivot that fixed the math.',
  },
  plaude: {
    title: 'How PLAUD AI Bootstrapped to $250M ARR: Growth Story',
    description: 'From a $5K Kickstarter to $250M ARR in 27 months — bootstrapped, hardware-first, explicitly small. What consumer AI hardware looks like when it works.',
  },
  replit: {
    title: 'How Replit Grew From $10M to $253M ARR in 13 Months',
    description: 'Eight years of platform substrate, one default-dead moment, then $10M to $253M ARR in 13 months after Replit Agent shipped. The cleanest D1 inflection on record.',
  },
  vercel: {
    title: 'How Vercel Grew to $9.3B Valuation: An 8-Year Growth Story',
    description: 'Eight years of free framework, six rounds, a $9.3B valuation. The cleanest case of substrate plus tech narrative upgrade stacked over a decade.',
  },
  clay: {
    title: 'How Clay Hit $100M ARR in 42 Months: Growth Teardown',
    description: 'From slow growth to $100M ARR in 42 months after a 2022 pivot. The cleanest compound-stacking case: forkable templates, creator ecosystem, two-founder GTM.',
  },
  lemlist: {
    title: 'How Lemlist Bootstrapped to $45M ARR (Zero VC, 7 Years)',
    description: '7 years bootstrapped, $0 VC, $45M ARR in saturated cold email. One founder\'s daily content cadence as the GTM engine — the loudest B2 + C3 stack in B2B SaaS.',
  },
  posthog: {
    title: 'How PostHog Got to $50M ARR With Radical Transparency',
    description: 'From 5 pivots in 6 months at YC W20 to $50M ARR and a $1.4B valuation. The handbook is the demo, transparency is the moat — proactive transparency as GTM.',
  },
}

let changed = 0
for (const [slug, fields] of Object.entries(updates)) {
  const filePath = path.join(root, slug, 'index.mdx')
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIP missing: ${filePath}`)
    continue
  }
  const original = fs.readFileSync(filePath, 'utf8')
  // Match the YAML frontmatter at the top of the file and only rewrite the
  // first occurrences of `title:` and `description:` inside it. The body
  // stays byte-identical.
  const fmEnd = original.indexOf('\n---', 4)
  if (!original.startsWith('---\n') || fmEnd === -1) {
    console.warn(`SKIP no frontmatter: ${filePath}`)
    continue
  }
  const frontmatter = original.slice(0, fmEnd)
  const body = original.slice(fmEnd)

  const escape = (s) => s.replace(/"/g, '\\"')
  const newFm = frontmatter
    .replace(/^title:\s*".*"\s*$/m, `title: "${escape(fields.title)}"`)
    .replace(/^description:\s*".*"\s*$/m, `description: "${escape(fields.description)}"`)

  if (newFm === frontmatter) {
    console.warn(`SKIP no change: ${slug}`)
    continue
  }
  fs.writeFileSync(filePath, newFm + body)
  console.log(`updated: ${slug}`)
  changed++
}
console.log(`\n${changed}/${Object.keys(updates).length} files updated.`)
