/**
 * Daily content sprint.
 *
 * Trigger: cron daily 08:30 UTC (right after Trend Digest cron 08:00).
 * Real ritual: founder wakes up, checks "what should I post today?"
 *
 * Steps:
 *   1. Refresh trend digest (auto)
 *   2. GATE — show top 3 drafts, user picks ONE (or ✕ to skip)
 *   3. Refresh post-ROI digest (auto, attaches template recommendation)
 *   4. EXTERNAL — open X compose deep-link with selected draft
 *
 * Outcome: founder ships one high-confidence post in <5 min.
 */
import type { Workflow, WorkflowContext } from './types'
import { runTrendDigest, listTrendCandidates, updateCandidateStatus } from '@/lib/agents/trend-digest'
import { ingestSelfPosts, buildRoiDigest, persistDigest } from '@/lib/agents/post-roi'

export const daily_content_sprint: Workflow = {
  id: 'daily_content_sprint',
  name: 'Daily content sprint',
  description: 'Build today\'s "tweets to ride" list, you pick one, we hand you X compose with it pre-filled. Done in 5 min.',
  embodies: 'Founder\'s morning ritual: open X, scroll trending, draft a post, ship.',
  estimatedMinutes: 5,
  outcome: 'One high-confidence post shipped today',
  triggers: [
    { kind: 'cron', cron: '30 8 * * *', note: 'Daily 08:30 UTC (after trend digest)' },
    { kind: 'manual', note: 'Anytime via chat or /gtm/workflows' },
  ],
  steps: [
    {
      id: 'refresh_trend',
      kind: 'agent',
      label: 'Refresh today\'s trend digest',
      async run(ctx: WorkflowContext) {
        const r = await runTrendDigest(ctx.workspace)
        return {
          ok: true,
          output: { inserted: r.inserted, scanned: r.scanned },
          summary: `${r.inserted} new drafts (scanned ${r.scanned})`,
        }
      },
    },
    {
      id: 'pick_draft',
      kind: 'gate',
      label: 'Pick a draft to ship today',
      async run(ctx: WorkflowContext) {
        if (ctx.resumeData) {
          const choice = (ctx.resumeData as { candidate_id?: string }).candidate_id
          if (!choice) return { ok: true, summary: 'Skipped — no draft picked today' }
          // mark as posted in trend_candidates so it doesn't show again
          await updateCandidateStatus(choice, 'posted')
          return { ok: true, output: { picked_id: choice }, summary: `Picked candidate ${choice.slice(0, 8)}` }
        }
        // First pass: load top candidates and pause
        const candidates = await listTrendCandidates(ctx.workspace.id, 50)
        const fresh = candidates.filter((c) => c.status === 'new').slice(0, 5)
        if (fresh.length === 0) {
          return { ok: true, summary: 'No fresh candidates today — skipping' }
        }
        return {
          ok: true,
          pause: {
            reason: 'pick_draft',
            payload: { candidates: fresh },
          },
        }
      },
    },
    {
      id: 'refresh_roi',
      kind: 'agent',
      label: 'Refresh your post ROI digest',
      async run(ctx: WorkflowContext) {
        const i = await ingestSelfPosts(ctx.workspace)
        const digest = await buildRoiDigest(ctx.workspace)
        await persistDigest(digest)
        return {
          ok: true,
          output: { posts_count: digest.posts_count, top_count: digest.top_templates.length },
          summary: `Refreshed ROI (analyzed ${digest.posts_count} posts; ${i.upserted} new ingested)`,
        }
      },
    },
    {
      id: 'open_compose',
      kind: 'external',
      label: 'Open X compose with your picked draft',
      async run(ctx: WorkflowContext) {
        const picked = (ctx.priorOutputs.pick_draft as { picked_id?: string } | undefined)?.picked_id
        if (!picked) return { ok: true, summary: 'No draft picked — workflow complete' }
        // Look up the draft text for the artifact
        const candidates = await listTrendCandidates(ctx.workspace.id, 50)
        const c = candidates.find((x) => x.id === picked)
        if (!c) return { ok: false, error: 'Picked candidate not found' }
        const composeUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(c.drafted_post)}`
        return {
          ok: true,
          summary: 'X compose ready — click to ship',
          artifact: { kind: 'tweet', ref: picked, url: composeUrl, title: c.drafted_post.slice(0, 80) },
        }
      },
    },
  ],
}
