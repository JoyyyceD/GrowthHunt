/**
 * Cron: daily reminder for scheduled creator-outreach drafts.
 * Schedule: every day at 14:00 UTC (configured in vercel.json).
 *
 * Since auto-sending X DMs requires X OAuth (out of v1 scope), we instead
 * send the workspace owner an email digest of drafts due today with deep
 * links to X compose. The user clicks, sends, status updates manually.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/brevo'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

interface DueDraft {
  id: string
  workspace_id: string
  target_handle: string
  target_name: string | null
  message_body: string
  scheduled_for: string
  audience_score: number
}

interface WorkspaceDigest {
  ownerEmail: string | null
  workspaceName: string
  workspaceUrl: string
  brandEmoji: string | null
  brandColor: string | null
  drafts: DueDraft[]
}

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function buildEmailHtml(digest: WorkspaceDigest): string {
  const color = digest.brandColor || '#e84e1b'
  const rows = digest.drafts.map((d) => {
    const composeUrl = `https://x.com/messages/compose?recipient_id=${encodeURIComponent(d.target_handle)}&text=${encodeURIComponent(d.message_body)}`
    return `
    <div style="margin-bottom:16px;padding:14px 16px;border:1px solid #eee;border-radius:10px;background:#fff">
      <div style="font:600 13px/1 -apple-system,system-ui,sans-serif;color:#111;margin-bottom:6px">
        @${escapeHtml(d.target_handle)}
        ${d.target_name ? `<span style="color:#666;font-weight:400">· ${escapeHtml(d.target_name)}</span>` : ''}
        <span style="float:right;font:600 11px monospace;color:#fff;background:${color};padding:2px 7px;border-radius:4px">${d.audience_score}</span>
      </div>
      <div style="font:13px/1.55 -apple-system,system-ui,sans-serif;color:#333;white-space:pre-wrap;margin-bottom:10px">${escapeHtml(d.message_body)}</div>
      <a href="${composeUrl}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;border-radius:999px;padding:8px 16px;font:600 12px/1 -apple-system,system-ui,sans-serif">
        Send on X →
      </a>
    </div>`
  }).join('')

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafafa;font-family:-apple-system,system-ui,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
    <div style="padding:22px 28px;border-bottom:1px solid #eee">
      <div style="font:11px/1 monospace;text-transform:uppercase;letter-spacing:.08em;color:#999">GrowthHunt · Creator Outreach</div>
      <h1 style="margin:8px 0 0;font:400 22px/1.2 'Instrument Serif',serif;color:#111">
        ${digest.brandEmoji ? `${digest.brandEmoji} ` : ''}${escapeHtml(digest.workspaceName)} — ${digest.drafts.length} DM${digest.drafts.length === 1 ? '' : 's'} scheduled today
      </h1>
    </div>
    <div style="padding:18px 28px;background:#fafafa">${rows}</div>
    <div style="padding:18px 28px;border-top:1px solid #eee;font:12px/1.5 -apple-system,system-ui,sans-serif;color:#999">
      Click "Send on X" to open the message in X compose. After sending, mark replied at <a href="${digest.workspaceUrl}/agents/creator" style="color:#999">growthhunt.ai/agents/creator</a>.
    </div>
  </div>
</body></html>`
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Pull due drafts and dedupe via last_remind_at < 12h ago so we don't re-spam.
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data: drafts } = await admin
    .from('outreach_drafts')
    .select('id, workspace_id, target_handle, target_name, message_body, scheduled_for, audience_score, last_remind_at')
    .lte('scheduled_for', now)
    .eq('status', 'queued')
    .eq('channel', 'x_dm')
    .or(`last_remind_at.is.null,last_remind_at.lt.${cutoff}`)
    .order('audience_score', { ascending: false })
    .limit(200)

  const byWorkspace = new Map<string, DueDraft[]>()
  for (const d of (drafts || []) as Array<DueDraft & { last_remind_at: string | null }>) {
    if (!d.target_handle || !d.message_body) continue
    const list = byWorkspace.get(d.workspace_id) || []
    list.push(d)
    byWorkspace.set(d.workspace_id, list)
  }

  const summary = { workspaces: 0, drafts: 0, sent: 0, errors: 0 }
  for (const [workspaceId, drafts] of byWorkspace.entries()) {
    summary.workspaces += 1
    summary.drafts += drafts.length

    const { data: ws } = await admin
      .from('gtm_workspaces')
      .select('id, owner_id, name, url, emoji, brand_color')
      .eq('id', workspaceId)
      .maybeSingle()
    if (!ws) continue

    let ownerEmail: string | null = null
    if (ws.owner_id) {
      const { data: profile } = await admin.from('profiles').select('email').eq('id', ws.owner_id).maybeSingle()
      if (profile?.email) ownerEmail = profile.email as string
    }
    if (!ownerEmail) {
      summary.errors += 1
      continue
    }

    try {
      const digest: WorkspaceDigest = {
        ownerEmail,
        workspaceName: (ws.name as string) || 'Your workspace',
        workspaceUrl: (ws.url as string) || 'https://growthhunt.ai',
        brandEmoji: (ws.emoji as string | null) ?? null,
        brandColor: (ws.brand_color as string | null) ?? null,
        drafts,
      }
      await sendTransactionalEmail({
        to: ownerEmail,
        subject: `${digest.drafts.length} creator DM${digest.drafts.length === 1 ? '' : 's'} ready to send · ${digest.workspaceName}`,
        htmlContent: buildEmailHtml(digest),
      })
      summary.sent += 1
      const ids = drafts.map((d) => d.id)
      await admin.from('outreach_drafts').update({ last_remind_at: now }).in('id', ids)
    } catch (err) {
      console.error('[creator-cron] email failed:', (err as Error).message)
      summary.errors += 1
    }
  }

  return NextResponse.json(summary)
}
