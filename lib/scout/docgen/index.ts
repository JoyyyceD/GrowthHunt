/**
 * Doc generators — each turns BrandIntelligence into one knowledge-base
 * document (onboarding-spec §1), streaming markdown as it writes.
 *
 * Shared hard rules ride along in every prompt: no invented stats, no
 * buzzwords, specificity over abstraction. Generators are pure (no DB) —
 * the onboarding pipeline persists results via the artifact store.
 */
import { chatStream, SCOUT_MODEL } from '../client'
import type { BrandIntelligence } from '../intel'

export interface DocSpec {
  slug: string
  title: (intel: BrandIntelligence) => string
  /** Per-doc outline + style instructions. */
  prompt: (intel: BrandIntelligence) => string
  maxTokens?: number
}

export interface GeneratedDoc {
  slug: string
  title: string
  contentMd: string
  summary: string
}

export interface GenerateOptions {
  workspaceId?: string | null
  model?: string
  onDelta?: (slug: string, text: string) => void
}

const SHARED_RULES = `Hard rules for every document:
- Write in English, plain and specific. Real names, real numbers, real channels.
- Number discipline, three classes:
  (1) FACT CLAIMS — market sizes, product achievements (stars, users, limits), competitor prices, outcome claims ("3x better", "saves 10 hrs/week"): ONLY if present in the intelligence; otherwise write around the gap. Never contradict the intelligence.
  (2) PRESCRIPTIONS — posting frequency, pillar percentages, response windows, suggested budgets: allowed, but phrase as recommendations ("aim for", "start with"), never as established facts.
  (3) PERSONA ILLUSTRATION — names, ages, cities, company sizes inside persona examples: allowed only where the doc explicitly frames the persona as an illustration.
- NEVER name a competitor that is not in the intelligence competitors list.
- Banned: "revolutionary", "game-changing", "in today's fast-paced world", "unlock", "empower", "elevate", artificial urgency.
- Markdown only. No preamble, no "Here is the document" — start directly with the first heading.
- Sentence case headings. Short paragraphs. No filler.
- Copy style floor: simple words (use, help — never utilize, leverage, facilitate); active voice; zero exclamation points; benefits over features; specificity over vagueness; confident phrasing (cut "almost", "very", "really").`

export async function generateDoc(
  spec: DocSpec,
  intel: BrandIntelligence,
  opts: GenerateOptions = {},
): Promise<GeneratedDoc> {
  const model = opts.model || SCOUT_MODEL
  const systemPrompt = `You write brand strategy documents that a founder can use as-is.\n\n${SHARED_RULES}`
  const userPrompt = `${spec.prompt(intel)}\n\n--- BRAND INTELLIGENCE (your only source of facts) ---\n${JSON.stringify(intel, null, 1)}`

  const result = await chatStream({
    model,
    workspaceId: opts.workspaceId ?? null,
    kind: `docgen:${spec.slug}`,
    maxTokens: spec.maxTokens ?? 2500,
    temperature: 0.4,
    // Streaming only when someone is watching the typewriter; otherwise a
    // plain JSON response — long streams truncate under Next dev (decision 7.8).
    stream: opts.onDelta ? undefined : false,
    onDelta: text => opts.onDelta?.(spec.slug, text),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })
  let contentMd = result.content.trim()

  // Reasoning models sometimes think out loud in the content channel. Every
  // prompt demands the doc start with a heading, so a non-'#' start is a
  // reliable leak detector → retry via forced tool call (reasoning stays in
  // the hidden channel there; verified on the intel pipeline).
  if (!contentMd.startsWith('#')) {
    const retry = await chatStream({
      model,
      workspaceId: opts.workspaceId ?? null,
      kind: `docgen:${spec.slug}:retry`,
      maxTokens: (spec.maxTokens ?? 2500) + 2000,
      temperature: 0.4,
      stream: false,
      tools: [{
        name: 'submit_document',
        description: 'Submit the finished markdown document.',
        parameters: {
          type: 'object',
          properties: {
            content_md: { type: 'string', description: 'the complete document, starting with a # heading' },
          },
          required: ['content_md'],
        },
      }],
      messages: [
        { role: 'system', content: `${systemPrompt}\n\nReturn the document by calling submit_document.` },
        { role: 'user', content: userPrompt },
      ],
    })
    const call = retry.toolCalls.find(c => c.name === 'submit_document')
    if (call) {
      try {
        contentMd = String((JSON.parse(call.arguments) as { content_md?: string }).content_md || '').trim()
      } catch {
        // keep original
      }
    }
  }
  if (contentMd.length < 200 || !contentMd.startsWith('#')) {
    throw new Error(`docgen:${spec.slug} produced unusable output (${contentMd.length} chars)`)
  }

  // Forced tool call so reasoning models keep their thinking out of the
  // summary (free Nemotron leaks chain-of-thought into plain content).
  const summaryResult = await chatStream({
    model,
    workspaceId: opts.workspaceId ?? null,
    kind: `docgen:${spec.slug}:summary`,
    maxTokens: 1200,
    temperature: 0.2,
    stream: false,
    tools: [{
      name: 'submit_summary',
      description: 'Submit the document summary.',
      parameters: {
        type: 'object',
        properties: { summary: { type: 'string', description: '<= 60 words, plain English, no markdown' } },
        required: ['summary'],
      },
    }],
    messages: [
      {
        role: 'system',
        content: "Summarize the document in <= 60 words via submit_summary. The summary is injected into an AI assistant's context so it knows what the doc covers.",
      },
      { role: 'user', content: contentMd.slice(0, 8000) },
    ],
  })
  let summary = ''
  const call = summaryResult.toolCalls.find(c => c.name === 'submit_summary')
  if (call) {
    try {
      summary = String((JSON.parse(call.arguments) as { summary?: string }).summary || '')
    } catch {
      summary = ''
    }
  }
  if (!summary) summary = summaryResult.content.trim().slice(0, 400)

  return {
    slug: spec.slug,
    title: spec.title(intel),
    contentMd,
    summary,
  }
}
