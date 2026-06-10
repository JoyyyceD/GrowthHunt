/**
 * Onboarding pipeline — URL → BrandIntelligence → 7 knowledge-base docs →
 * first-week posts queued as 'proposed'.
 *
 * Runs inside the SSE request (decision 7.4, Vercel Pro 300s). Progress is
 * persisted to scout_tasks after every stage so a dropped connection can
 * replay from the DB. Narration lines carry a real finding each (spec §3).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { patchWorkspace, getWorkspace } from '@/lib/workspace/store'
import { insertScheduledPost } from '@/lib/postiz/store'
import { chatStream, SCOUT_MODEL } from './client'
import { gatherIntel, type BrandIntelligence } from './intel'
import { generateDoc } from './docgen'
import { onboardingDocs } from './docgen/all'
import type { ScoutEvent } from './types'

export interface OnboardingInput {
  workspaceId: string
  url: string
  brief?: string
  conversationId?: string | null
  emit?: (event: ScoutEvent) => void
  model?: string
  /** Pre-created scout_tasks row (fire-and-poll: the route returns this id immediately). */
  taskId?: string
}

export interface OnboardingResult {
  taskId: string
  status: 'done' | 'needs_brief' | 'failed'
  docsWritten: string[]
  postsQueued: number
}

const NEEDS_BRIEF_THRESHOLD = 0.4
const DOC_CONCURRENCY = 2

export async function createOnboardingTask(workspaceId: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scout_tasks')
    .insert({ workspace_id: workspaceId, kind: 'onboarding', status: 'scraping' })
    .select('id')
    .single()
  if (error || !data) throw new Error(`scout_tasks insert failed: ${error?.message}`)
  return data.id as string
}

async function updateTask(taskId: string, patch: Record<string, unknown>): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('scout_tasks')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', taskId)
}

/** Extract queueable posts from the generated calendar doc (forced tool call). */
async function extractCalendarPosts(
  calendarMd: string,
  workspaceId: string,
  model?: string,
): Promise<Array<{ platform: string; content: string; day: number }>> {
  const result = await chatStream({
    model: model || SCOUT_MODEL,
    workspaceId,
    kind: 'onboarding-calendar-extract',
    maxTokens: 4000,
    temperature: 0,
    stream: false,
    tools: [{
      name: 'submit_posts',
      description: 'Submit the posts extracted from the calendar table.',
      parameters: {
        type: 'object',
        properties: {
          posts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day: { type: 'number', description: '1-7' },
                platform: { type: 'string', description: 'lowercase: x, linkedin, reddit, facebook…' },
                content: { type: 'string', description: 'the complete post body, verbatim from the table' },
              },
              required: ['day', 'platform', 'content'],
            },
          },
        },
        required: ['posts'],
      },
    }],
    messages: [
      { role: 'system', content: 'Extract every post from this content calendar table via submit_posts. Copy bodies verbatim. Normalize platform names to lowercase single words (x, linkedin, reddit, facebook).' },
      { role: 'user', content: calendarMd },
    ],
  })
  const call = result.toolCalls.find(c => c.name === 'submit_posts')
  if (!call) return []
  try {
    return ((JSON.parse(call.arguments) as { posts?: Array<{ platform: string; content: string; day: number }> }).posts || [])
      .filter(p => p.content && p.platform)
  } catch {
    return []
  }
}

function workspacePatchFromIntel(intel: BrandIntelligence): Record<string, unknown> {
  const primary = intel.audience.segments[0]
  return {
    name: intel.product.name,
    one_liner: intel.product.oneLiner,
    icp_summary: primary
      ? `${primary.name} (${primary.role}${primary.ageRange ? `, ${primary.ageRange}` : ''}): ${primary.jtbd}`
      : intel.product.oneLiner,
    competitors: intel.competitors.slice(0, 5).map(c => ({ name: c.name, url: c.url || '', note: c.vsUs })),
    brand_color: intel.brand.palette[0]?.hex || undefined,
  }
}

export async function runOnboardingPipeline(input: OnboardingInput): Promise<OnboardingResult> {
  const emit = input.emit || (() => {})
  const taskId = input.taskId || (await createOnboardingTask(input.workspaceId))
  const milestones: ScoutEvent[] = []

  // All DB writes ride one chain: fire-and-forget narration updates can never
  // land after (and overwrite) the terminal status write.
  let writeChain: Promise<void> = Promise.resolve()
  const queueWrite = (patch: Record<string, unknown>) => {
    writeChain = writeChain.then(() => updateTask(taskId, patch)).catch(() => {})
    return writeChain
  }

  const progress = async (event: ScoutEvent, taskPatch?: Record<string, unknown>) => {
    emit(event)
    // deltas are ephemeral; only milestones are replayable after reconnect
    if (event.type !== 'artifact_delta' && event.type !== 'text_delta') {
      milestones.push(event)
      await queueWrite({ progress: [...milestones], ...taskPatch })
    }
  }

  try {
    await progress(
      {
        type: 'status',
        stage: 'scraping',
        narration: "I'm Scout, your AI growth teammate. Give me about 30 seconds — I'll scan your site and your market, then build the brand playbook everything I write for you stands on. 🐾",
      },
      { status: 'scraping' },
    )

    const { intel } = await gatherIntel(input.url, {
      brief: input.brief,
      workspaceId: input.workspaceId,
      model: input.model,
      onStage: (stage, detail) => {
        if (stage === 'researching') {
          void progress({ type: 'status', stage, narration: `Got it — ${detail}. Now scoping your market and competitors…` }, { status: 'researching' })
        } else if (stage === 'synthesizing') {
          void progress({ type: 'status', stage, narration: 'Locking in your brand identity…' }, { status: 'synthesizing' })
        }
      },
    })

    // A user-provided brief substitutes for a thin scrape — only stop to ask
    // when we have neither.
    if (intel.confidence.scrape < NEEDS_BRIEF_THRESHOLD && !input.brief?.trim()) {
      await progress(
        {
          type: 'ask_user',
          question: "Your site's playing hard to get — I couldn't read enough to do this properly. Tell me three things instead: what you sell, who it's for, and what makes it different.",
        },
        { status: 'needs_brief', result: { intel } },
      )
      return { taskId, status: 'needs_brief', docsWritten: [], postsQueued: 0 }
    }

    const topCompetitor = intel.competitors[0]?.name
    await progress({
      type: 'status',
      stage: 'drafting',
      narration: `${intel.product.name} — ${intel.product.oneLiner}${topCompetitor ? ` Your sharpest edge vs ${topCompetitor} is already showing in the research.` : ''} Now writing your seven core documents…`,
    }, { status: 'drafting' })

    await patchWorkspace(input.workspaceId, workspacePatchFromIntel(intel))

    // Case engine (V2-T0a): real Growth Story precedents for strategy/calendar.
    // Best-effort — an empty match list just omits the precedent sections.
    let caseNotes: string | undefined
    try {
      const { matchCases, buildCaseNotes } = await import('./case-match')
      caseNotes = buildCaseNotes(await matchCases(intel, input.workspaceId, input.model))
    } catch (e) {
      console.error('[scout] case-match failed:', (e as Error).message)
    }

    // Lazy import avoids a cycle (tools → artifacts, onboarding → both).
    const { upsertArtifact } = await import('./artifacts')
    const specs = onboardingDocs(caseNotes)
    const docsWritten: string[] = []
    let calendarMd = ''

    const queue = [...specs]
    const workers = Array.from({ length: DOC_CONCURRENCY }, async () => {
      for (;;) {
        const spec = queue.shift()
        if (!spec) return
        try {
          const doc = await generateDoc(spec, intel, {
            workspaceId: input.workspaceId,
            model: input.model,
            // fire-and-poll has no live listener — undefined keeps docgen non-streaming
            onDelta: input.emit ? (slug, text) => emit({ type: 'artifact_delta', slug, text }) : undefined,
          })
          const saved = await upsertArtifact({
            workspaceId: input.workspaceId,
            slug: doc.slug,
            title: doc.title,
            contentMd: doc.contentMd,
            summary: doc.summary,
            taskId,
          })
          if (saved) {
            docsWritten.push(doc.slug)
            if (doc.slug === 'first-week-calendar') calendarMd = doc.contentMd
            await progress({ type: 'artifact_done', slug: saved.slug, title: saved.title, rev: saved.rev })
          }
        } catch (e) {
          await progress({ type: 'error', message: `${spec.slug} failed: ${(e as Error).message} — you can ask me to retry it.` })
        }
      }
    })
    await Promise.all(workers)

    let postsQueued = 0
    if (calendarMd) {
      const posts = await extractCalendarPosts(calendarMd, input.workspaceId, input.model)
      const base = new Date()
      base.setDate(base.getDate() + 1)
      base.setHours(9, 0, 0, 0)
      for (const p of posts) {
        const when = new Date(base)
        when.setDate(base.getDate() + (Math.max(1, Math.min(7, p.day)) - 1))
        const row = await insertScheduledPost({
          workspaceId: input.workspaceId,
          postizPostId: null,
          integrationId: '',
          platform: p.platform,
          content: p.content,
          type: 'draft',
          scheduledFor: when.toISOString(),
          status: 'proposed' as never,
          source: 'scout-onboarding',
          conversationId: input.conversationId ?? null,
        })
        if (row) postsQueued++
      }
    }

    const ws = await getWorkspace(input.workspaceId)
    await progress(
      {
        type: 'done',
        reply: `Done. ${docsWritten.length} documents are in your knowledge base${postsQueued ? ` and your first ${postsQueued} posts are queued as drafts — approve them when you're ready` : ''}. ${intel.product.name} sits in a real gap: ${intel.competitors[0] ? `${intel.competitors[0].name} ${intel.competitors[0].gaps[0]?.toLowerCase() || 'leaves room'}, and that's exactly where we'll press.` : "the research found no entrenched rival, which means speed matters more than positioning."} Ask me anything about ${ws?.name || 'your brand'}, or say "what should I post today". 🐾`,
      },
      { status: docsWritten.length ? 'done' : 'failed', result: { intel, docsWritten, postsQueued } },
    )
    return { taskId, status: docsWritten.length ? 'done' : 'failed', docsWritten, postsQueued }
  } catch (e) {
    const message = (e as Error).message
    await queueWrite({ status: 'failed', error: message })
    emit({ type: 'error', message })
    return { taskId, status: 'failed', docsWritten: [], postsQueued: 0 }
  }
}
