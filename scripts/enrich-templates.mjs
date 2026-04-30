/**
 * Phase 1: Bulk-fetch a large pool of HN stories (no filtering by topic yet)
 * Phase 2: Match locally against all 27 templates
 * Run: node scripts/enrich-templates.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RAW_PATH = join(ROOT, 'data/hn-raw.json')

const DELAY_MS = 120   // polite delay between requests

// ── Algolia HN Search ──────────────────────────────────────────────────────────

async function algolia({ tags = 'story', query = '', page = 0, hitsPerPage = 1000, sortByDate = false } = {}) {
  const endpoint = sortByDate
    ? 'https://hn.algolia.com/api/v1/search_by_date'
    : 'https://hn.algolia.com/api/v1/search'
  const params = new URLSearchParams({
    tags,
    hitsPerPage,
    page,
    attributesToRetrieve: 'objectID,title,points,num_comments,created_at',
  })
  if (query) params.set('query', query)
  const res = await fetch(`${endpoint}?${params}`)
  const data = await res.json()
  return {
    hits: (data.hits || []).map(h => ({
      id: h.objectID,
      title: (h.title || '').trim(),
      score: h.points || 0,
      comments: h.num_comments || 0,
      created_at: h.created_at,
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    })),
    nbPages: data.nbPages || 1,
    nbHits: data.nbHits || 0,
  }
}

async function fetchAllPages(label, opts, maxPages = 5) {
  const all = []
  const first = await algolia({ ...opts, page: 0 })
  all.push(...first.hits)
  const totalPages = Math.min(first.nbPages, maxPages)
  process.stdout.write(`  ${label.padEnd(35)} page 1/${totalPages}`)
  for (let p = 1; p < totalPages; p++) {
    await new Promise(r => setTimeout(r, DELAY_MS))
    const { hits } = await algolia({ ...opts, page: p })
    all.push(...hits)
    process.stdout.write(` ${p + 1}/${totalPages}`)
  }
  console.log(` → ${all.length} stories`)
  return all
}

// ── Phase 1: BULK FETCH ────────────────────────────────────────────────────────

console.log('=== Phase 1: Bulk Fetching ===\n')

// Show HN — dedicated tag, by relevance (high scoring first)
const showHN = await fetchAllPages('Show HN (relevance)',   { tags: 'story,show_hn' }, 5)
await new Promise(r => setTimeout(r, DELAY_MS))

// Show HN — also by date to catch different stories
const showHNDate = await fetchAllPages('Show HN (by date)',  { tags: 'story,show_hn', sortByDate: true }, 5)
await new Promise(r => setTimeout(r, DELAY_MS))

// Ask HN — dedicated tag
const askHN = await fetchAllPages('Ask HN (relevance)',     { tags: 'story,ask_hn' }, 5)
await new Promise(r => setTimeout(r, DELAY_MS))

const askHNDate = await fetchAllPages('Ask HN (by date)',   { tags: 'story,ask_hn', sortByDate: true }, 5)
await new Promise(r => setTimeout(r, DELAY_MS))

// General stories — by date across multiple pages to get broad topic diversity
const general1 = await fetchAllPages('General (date pg 0-5)', { tags: 'story', sortByDate: true }, 5)
await new Promise(r => setTimeout(r, DELAY_MS))
const general2 = await fetchAllPages('General (date pg 5-10)', { tags: 'story', sortByDate: true, page: 5 }, 5)
await new Promise(r => setTimeout(r, DELAY_MS))

// Keyword-targeted broad fetches for underrepresented categories
const batches = [
  ['why I stopped/quit/left',   { tags: 'story', query: 'why I stopped' }],
  ['is broken / is dead',       { tags: 'story', query: 'is broken' }],
  ['I analyzed / I studied',    { tags: 'story', query: 'I analyzed' }],
  ['How I built',               { tags: 'story', query: 'How I built' }],
  ['wish I knew',               { tags: 'story', query: 'wish I knew' }],
  ['mistakes I made',           { tags: 'story', query: 'mistakes I made' }],
  ['open sourced',              { tags: 'story', query: 'open sourced' }],
  ['without framework',         { tags: 'story', query: 'without' }],
  ['real reason',               { tags: 'story', query: 'real reason' }],
  ['AI replaced / LLM built',   { tags: 'story', query: 'AI replaced LLM' }],
]

const keywordBatches = []
for (const [label, opts] of batches) {
  const hits = await fetchAllPages(label, opts, 2)
  keywordBatches.push(...hits)
  await new Promise(r => setTimeout(r, DELAY_MS))
}

// ── Merge & Dedupe ────────────────────────────────────────────────────────────

const seen = new Set()
const pool = [
  ...showHN, ...showHNDate,
  ...askHN, ...askHNDate,
  ...general1, ...general2,
  ...keywordBatches,
].filter(s => s.title && !seen.has(s.id) && seen.add(s.id))
  .sort((a, b) => b.score - a.score)

console.log(`\nPool: ${pool.length} unique stories`)

// Save raw checkpoint
writeFileSync(RAW_PATH, JSON.stringify(pool, null, 2))
console.log(`Raw data saved → data/hn-raw.json\n`)

// ── Phase 2: LOCAL MATCHING ───────────────────────────────────────────────────

console.log('=== Phase 2: Matching to Templates ===\n')

// Each rule maps to exact template ID from data/hn-templates.json
const RULES = [
  { id: 'show-hn-built-metric-timeframe',
    test: t => /^Show HN:/i.test(t) && /\b(users|stars|mrr|revenue|customers|downloads|installs|signups)\b/i.test(t) },
  { id: 'show-hn-solo-saas-revenue',
    test: t => /^Show HN:/i.test(t) && /(\$[\d,.]+[kKmM]?|MRR|ARR|revenue|profitable|profit|ramen)/i.test(t) },
  { id: 'show-hn-open-source-alternative',
    test: t => /^Show HN:/i.test(t) && /\b(alternative|open.?source|self.?host)\b/i.test(t) },
  { id: 'show-hn-built-years-using-myself',
    test: t => /^Show HN:/i.test(t) && /\b\d+\s*(year|years)\b/i.test(t) && !/\bafter\b.*\bfor\b/i.test(t) },
  { id: 'show-hn-after-years-of-building',
    test: t => /^Show HN:/i.test(t) && /\b(after|over)\b.+\b\d+\s*(year|years|month|months)\b/i.test(t) },
  { id: 'show-hn-weekend-project',
    test: t => /^Show HN:/i.test(t) && /\b(weekend|side project|hobby|spare time|for fun|built in \d)\b/i.test(t) },
  { id: 'ask-hn-what-do-you-use-for',
    test: t => /^Ask HN:/i.test(t) && /\b(what|which)\b.*(use|using|recommend|prefer|tool|stack)/i.test(t) },
  { id: 'ask-hn-how-do-you-handle',
    test: t => /^Ask HN:/i.test(t) && /\bhow\b.*(handle|deal|manage|do you|approach|stay|work)/i.test(t) },
  { id: 'ask-hn-is-it-just-me',
    test: t => /^Ask HN:/i.test(t) && /\b(just me|anyone else|am I|only one|feel like)\b/i.test(t) },
  { id: 'ask-hn-hiring',
    test: t => /^Ask HN:.*who('?s| is) hiring/i.test(t) },
  { id: 'opinion-why-i-stopped',
    test: t => /\bwhy I (stopped|quit|left|gave up|switched|moved away|dropped|deleted)\b/i.test(t) },
  { id: 'opinion-x-is-broken',
    test: t => /\b(is broken|is dead|is dying|is a mess|has failed|is over|is killing)\b/i.test(t) },
  { id: 'opinion-real-reason',
    test: t => /\b(real reason|truth about|honest(ly)?|unpopular opinion)\b/i.test(t) },
  { id: 'opinion-x-doesnt-matter',
    test: t => /\bdoesn'?t matter\b|\bdoes not matter\b|\bnot worth\b/i.test(t) },
  { id: 'data-analyzed-found',
    test: t => /\bI (analyzed|studied|scraped|collected|examined|tracked|measured|looked at)\b/i.test(t) },
  { id: 'data-years-of',
    test: t => /\b\d+\s*years?\b.*(data|analysis|study|research|experience|numbers|stats)\b/i.test(t) },
  { id: 'tool-we-open-sourced',
    test: t => /\bwe('ve)? (open.?source[d]?|released|published)\b/i.test(t) },
  { id: 'tool-announcing',
    test: t => /\bAnnounc(ing|ed?)\b/i.test(t) && !/^(Show|Ask) HN/i.test(t) },
  { id: 'tutorial-how-without',
    test: t => /\bwithout\b/i.test(t) && !/^(Show|Ask) HN/i.test(t) },
  { id: 'tutorial-how-i-did-in-timeframe',
    test: t => /\bHow I\b/i.test(t) && !/^Ask HN/i.test(t) },
  { id: 'numeric-list-things-learned',
    test: t => /\bwish I knew\b|\bI wish\b.*(knew|had known|learned)/i.test(t) },
  { id: 'numeric-list-mistakes',
    test: t => /\b(mistakes|lessons).*(made|learned|from|as a|building|starting)/i.test(t) },
  { id: 'contrarian-everyone-wrong',
    test: t => /\beveryone.*(wrong|mistaken|confused|lying|don'?t|doesn'?t)\b/i.test(t) ||
               /\bnobody.*(care|cares|talks)\b/i.test(t) },
  { id: 'contrarian-stop-doing',
    test: t => /\bplease stop\b|\bstop\s+(using|doing|writing|building)\b/i.test(t) },
  { id: 'product-launch-grew-to',
    test: t => /\b(hit|reached|crossed|passed|surpassed|grew to)\b.*(users|customers|\$[\d,]+[kKmM]?|downloads|signups|subscribers)\b/i.test(t) },
  { id: 'ai-tool-replaced',
    test: t => /\b(AI|GPT|LLM|Claude|ChatGPT)\b.*(replaced|replacing|made.*obsolete|killed|took over)\b/i.test(t) ||
               /\b(replaced|replacing|no longer need)\b.*(AI|GPT|LLM|Claude|ChatGPT)\b/i.test(t) },
  { id: 'ai-tool-built-with-llm',
    test: t => /^Show HN:/i.test(t) && /\b(AI|GPT|LLM|Claude|OpenAI|Gemini|Anthropic|agent|copilot)\b/i.test(t) },
]

const matchMap = {}
for (const rule of RULES) {
  const matches = pool
    .filter(s => rule.test(s.title))
    .slice(0, 5)
  matchMap[rule.id] = matches
  const mark = matches.length > 0 ? '✓' : '✗'
  console.log(`  ${mark} ${rule.id.padEnd(40)} ${matches.length} posts`)
  if (matches.length > 0) {
    for (const m of matches.slice(0, 2)) {
      console.log(`      ${String(m.score).padStart(5)}pts  ${m.title.slice(0, 85)}`)
    }
  }
}

// ── Phase 3: Write enriched templates ─────────────────────────────────────────

const templatesPath = join(ROOT, 'data/hn-templates.json')
const templates = JSON.parse(readFileSync(templatesPath, 'utf-8'))

let enriched = 0
for (const t of templates) {
  const matches = matchMap[t.id]
  if (matches && matches.length > 0) {
    t.examples = matches.map(m => ({
      title: m.title,
      score: m.score,
      comments: m.comments,
      url: m.url,
    }))
    enriched++
  } else {
    t.examples = []
  }
}

writeFileSync(templatesPath, JSON.stringify(templates, null, 2))
console.log(`\n=== Done. Enriched ${enriched} / ${templates.length} templates ===`)
