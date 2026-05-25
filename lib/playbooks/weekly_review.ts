/**
 * Weekly review playbook — runs Sunday 14:00 UTC per workspace.
 * Goal: surface "what changed this week + here's where to invest energy".
 */
import type { Playbook } from './types'
import { tracedGeoAudit, tracedCompetitor, tracedRadar } from '@/lib/orchestrator/agents'
import { sendTransactionalEmail } from '@/lib/brevo'
import { createAdminClient } from '@/lib/supabase/admin'

function host(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u }
}

export const weekly_review: Playbook = {
  id: 'weekly_review',
  name: 'Weekly review',
  description: 'GEO re-audit + competitor diff + radar scan, then email the workspace owner a digest. Runs Sundays automatically.',
  estimatedMinutes: 5,
  steps: [
    {
      id: 'geo',
      kind: 'geo_audit',
      label: 'GEO re-audit on workspace URL',
      async run(ctx) {
        const { result } = await tracedGeoAudit(ctx.workspace.url, {
          workspace_id: ctx.workspace.id,
          conversation_id: ctx.conversationId,
          parent_task_id: ctx.parentTaskId,
          triggered_by: 'playbook',
        })
        return { ok: true, output: { score: result.overall_score, grade: result.grade, issues: result.issues.length }, summary: `GEO ${result.overall_score}/100` }
      },
    },
    {
      id: 'competitor',
      kind: 'competitor',
      label: 'Competitor snapshots + diffs',
      skipIf: (ws) => (ws.competitors || []).filter((c) => c.url).length === 0,
      async run(ctx) {
        const { result } = await tracedCompetitor(
          { workspace: ctx.workspace, diff: true },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return { ok: true, output: result, summary: `${result.snapshots} snap, ${result.diffs} change(s)` }
      },
    },
    {
      id: 'radar',
      kind: 'radar',
      label: 'Reddit + HN scan',
      skipIf: (ws) => !ws.icp_summary && ws.icp_segments.length === 0,
      async run(ctx) {
        const { result } = await tracedRadar(
          { workspace: ctx.workspace },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return { ok: true, output: result, summary: `${result.inserted} new leads` }
      },
    },
    {
      id: 'digest',
      kind: 'chat_turn',
      label: 'Email the workspace owner',
      async run(ctx) {
        const ws = ctx.workspace
        const admin = createAdminClient()
        let email: string | null = null
        if (ws.owner_id) {
          const { data } = await admin.from('profiles').select('email').eq('id', ws.owner_id).maybeSingle()
          email = (data?.email as string) || null
        }
        if (!email) return { ok: true, summary: 'No owner email — skipping digest' }

        const geo = ctx.priorOutputs.geo as { score?: number; grade?: string; issues?: number } | undefined
        const comp = ctx.priorOutputs.competitor as { snapshots?: number; diffs?: number } | undefined
        const radar = ctx.priorOutputs.radar as { inserted?: number; scanned?: number } | undefined

        const subject = `Weekly review · ${ws.name}: GEO ${geo?.score ?? '—'}, ${comp?.diffs ?? 0} competitor changes, ${radar?.inserted ?? 0} new leads`
        const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#fafafa;font-family:-apple-system,system-ui,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
    <div style="padding:22px 28px;border-bottom:1px solid #eee">
      <div style="font:11px/1 monospace;text-transform:uppercase;letter-spacing:.08em;color:#999">GrowthHunt · Weekly Review</div>
      <h1 style="margin:8px 0 0;font:400 22px/1.2 'Instrument Serif',serif;color:#111">${ws.emoji ? ws.emoji + ' ' : ''}${ws.name}</h1>
      <p style="margin:6px 0 0;font:13px/1 monospace;color:#999">${host(ws.url)} · week ending ${new Date().toISOString().slice(0,10)}</p>
    </div>
    <div style="padding:20px 28px;border-bottom:1px solid #eee">
      <h2 style="margin:0 0 10px;font:600 13px/1 -apple-system,system-ui,sans-serif;color:#444;text-transform:uppercase;letter-spacing:.06em">GEO score</h2>
      <p style="margin:0;font:32px/1 'Instrument Serif',serif;color:${(geo?.score ?? 0) >= 70 ? '#16a34a' : (geo?.score ?? 0) >= 45 ? '#b07a00' : '#c0392b'}">${geo?.score ?? '—'}<span style="font-size:16px;color:#999"> /100 ${geo?.grade ?? ''}</span></p>
      ${geo?.issues ? `<p style="margin:6px 0 0;font:13px/1.4 -apple-system,system-ui,sans-serif;color:#666">${geo.issues} priority fix(es) flagged.</p>` : ''}
    </div>
    ${comp ? `<div style="padding:20px 28px;border-bottom:1px solid #eee">
      <h2 style="margin:0 0 10px;font:600 13px/1 -apple-system,system-ui,sans-serif;color:#444;text-transform:uppercase;letter-spacing:.06em">Competitor watch</h2>
      <p style="margin:0;font:13px/1.5 -apple-system,system-ui,sans-serif;color:#333">${comp.snapshots ?? 0} fresh snapshot(s), <strong>${comp.diffs ?? 0} change(s)</strong> detected.</p>
    </div>` : ''}
    ${radar ? `<div style="padding:20px 28px;border-bottom:1px solid #eee">
      <h2 style="margin:0 0 10px;font:600 13px/1 -apple-system,system-ui,sans-serif;color:#444;text-transform:uppercase;letter-spacing:.06em">Community radar</h2>
      <p style="margin:0;font:13px/1.5 -apple-system,system-ui,sans-serif;color:#333"><strong>${radar.inserted ?? 0} new leads</strong> from a scan of ${radar.scanned ?? 0} posts on Reddit + HN.</p>
    </div>` : ''}
    <div style="padding:20px 28px;background:#fafafa">
      <a href="https://growthhunt.ai/gtm" style="display:inline-block;background:#e84e1b;color:#fff;text-decoration:none;border-radius:999px;padding:10px 18px;font:600 13px/1 -apple-system,system-ui,sans-serif">Open mission control →</a>
    </div>
  </div>
</body></html>`
        try {
          await sendTransactionalEmail({ to: email, subject, htmlContent: html })
          return { ok: true, summary: `Digest emailed to ${email}` }
        } catch (err) {
          return { ok: false, error: (err as Error).message }
        }
      },
    },
  ],
}
