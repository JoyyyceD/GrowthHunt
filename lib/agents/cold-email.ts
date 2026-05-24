/**
 * Cold Email Outbound agent.
 *
 *   1. User pastes a list of B2B targets (name, email, company, role, note?).
 *   2. Agent drafts a personalized email per target — subject + body — in
 *      the workspace voice, referencing the company + role context.
 *   3. Drafts persist in outreach_drafts(channel='email').
 *   4. "Send via Brevo" actually sends the email through the existing
 *      transactional API. Indie-volume only — no warming, no sequencing.
 *
 * Brevo is a transactional provider; for low daily volume (10-50/day) the
 * dedicated-IP warming requirement that haunts cold-email-at-scale doesn't
 * apply — Brevo's shared IP handles deliverability.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/brevo'
import { callAgent, extractJson, workspaceContext, withVoice } from './llm'
import type { Workspace } from '@/lib/workspace/types'
import type { OutreachDraft } from './creator'

export const MAX_TARGETS_PER_RUN = 25
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ColdEmailTarget {
  name?: string
  email: string
  company?: string
  role?: string
  note?: string
}

export interface ColdEmailDraft extends OutreachDraft {
  email: string
  subject: string
  company?: string
  role?: string
}

interface DraftedRow {
  workspace_id: string
  channel: string
  target_email: string
  target_name: string | null
  target_handle: string | null
  target_url: string | null
  audience_score: number
  reasoning: string
  message_subject: string
  message_body: string
  status: string
}

interface RawDraft {
  email?: string
  subject?: string
  body?: string
  reasoning?: string
  audience_score?: number
}
interface RawResponse { drafts?: RawDraft[] }

/** Parse a pasted block of targets. Accepts CSV-ish or one-per-line. */
export function parseTargetCsv(input: string): ColdEmailTarget[] {
  const out: ColdEmailTarget[] = []
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (line.startsWith('#')) continue
    if (/^(name|email)\s*[,;\t]/i.test(line)) continue // skip header
    const parts = line.split(/\s*[,;\t]\s*/)
    const emailIdx = parts.findIndex((p) => EMAIL_RE.test(p))
    if (emailIdx < 0) continue
    const email = parts[emailIdx]!.toLowerCase()
    const name = emailIdx > 0 ? parts[0] : undefined
    const company = parts[emailIdx + 1]
    const role = parts[emailIdx + 2]
    const note = parts.slice(emailIdx + 3).join(', ') || undefined
    out.push({ email, name, company, role, note })
    if (out.length >= MAX_TARGETS_PER_RUN) break
  }
  return out
}

export interface ColdEmailRunInput {
  workspace: Workspace
  targets: ColdEmailTarget[]
  campaignNote?: string
}

export interface ColdEmailRunOutput {
  drafts: ColdEmailDraft[]
  notes: string
}

export async function runColdEmailAgent(input: ColdEmailRunInput): Promise<ColdEmailRunOutput> {
  const ws = input.workspace
  const targets = input.targets.filter((t) => EMAIL_RE.test(t.email)).slice(0, MAX_TARGETS_PER_RUN)
  if (targets.length === 0) {
    return { drafts: [], notes: 'No valid email addresses in the target list.' }
  }

  const system = withVoice(
    'You write short, personal cold emails for an indie founder doing B2B '
    + 'outreach. Rules: open with a SPECIFIC reason to write (company name + '
    + 'role + the founder\'s notes if any), one-sentence value prop tied to '
    + 'that role\'s actual problem, low-friction ask (one question, no calendar '
    + 'links). Subject must be 4-9 words, no clickbait, no all-caps, no emoji. '
    + 'Body must be 60-120 words, no greeting fluff like "Hope you\'re well", '
    + 'no signature (sender will add it). Reply with ONLY a JSON object.',
    ws.voice,
  )

  const ctx = workspaceContext(ws)
  const targetBlock = targets.map((t, i) => `[${i}] email=${t.email}, name=${t.name || '?'}, company=${t.company || '?'}, role=${t.role || '?'}${t.note ? `, note=${t.note}` : ''}`).join('\n')

  const user = [
    `WORKSPACE CONTEXT:\n${ctx}`,
    input.campaignNote ? `\nCAMPAIGN NOTE: ${input.campaignNote}` : '',
    '',
    `TARGETS (${targets.length}):\n${targetBlock}`,
    '',
    'Return JSON exactly:',
    '{',
    '  "drafts": [',
    '    {',
    '      "email": "<echo the target email>",',
    '      "subject": "<4-9 words>",',
    '      "body": "<60-120 words, no greeting fluff, no signature>",',
    '      "reasoning": "<1 sentence why this person now>",',
    '      "audience_score": 0-100 (how qualified this lead looks from given context)',
    '    }',
    '  ]',
    '}',
    '',
    'One draft per target — match by echoing the email. Skip nothing.',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 4500, temperature: 0.55 })
  const parsed = extractJson<RawResponse>(raw)
  if (!parsed?.drafts || !Array.isArray(parsed.drafts)) {
    return {
      drafts: [],
      notes: process.env.MINIMAX_API_KEY
        ? 'LLM returned no parseable response. Try fewer targets.'
        : 'Agent unavailable — set MINIMAX_API_KEY.',
    }
  }

  const byEmail = new Map<string, ColdEmailTarget>()
  for (const t of targets) byEmail.set(t.email.toLowerCase(), t)

  const rows: DraftedRow[] = []
  for (const d of parsed.drafts) {
    const email = String(d.email || '').toLowerCase()
    const t = byEmail.get(email)
    if (!t) continue
    rows.push({
      workspace_id: ws.id,
      channel: 'email',
      target_email: t.email,
      target_name: t.name || null,
      target_handle: null,
      target_url: null,
      audience_score: Math.max(0, Math.min(100, Math.round(Number(d.audience_score) || 60))),
      reasoning: `[${t.company || '—'}, ${t.role || '—'}] ${String(d.reasoning || '').slice(0, 300)}`,
      message_subject: String(d.subject || '').slice(0, 200),
      message_body: String(d.body || '').slice(0, 3000),
      status: 'queued',
    })
  }

  if (rows.length === 0) return { drafts: [], notes: 'No drafts produced.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('outreach_drafts')
    .insert(rows)
    .select('id, target_email, target_name, audience_score, reasoning, message_subject, message_body')
  if (error) return { drafts: [], notes: `Insert failed: ${error.message}` }

  const drafts: ColdEmailDraft[] = (data || []).map((d) => {
    const t = byEmail.get((d.target_email as string).toLowerCase())
    return {
      id: d.id as string,
      handle: '',
      email: d.target_email as string,
      display_name: (d.target_name as string | null) ?? null,
      followers: null,
      company: t?.company,
      role: t?.role,
      audience_score: d.audience_score as number,
      reasoning: d.reasoning as string,
      subject: d.message_subject as string,
      message_body: d.message_body as string,
    }
  }).sort((a, b) => b.audience_score - a.audience_score)

  return { drafts, notes: `Drafted ${drafts.length} cold emails. Review before sending.` }
}

export async function sendColdEmailDraft(draftId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()
  const { data: d, error } = await admin
    .from('outreach_drafts')
    .select('id, target_email, message_subject, message_body, status, workspace_id')
    .eq('id', draftId)
    .maybeSingle()
  if (error || !d) return { ok: false, error: 'Draft not found' }
  if (d.status === 'sent') return { ok: false, error: 'Already sent' }
  if (!d.target_email) return { ok: false, error: 'No target email' }
  if (!d.message_subject || !d.message_body) return { ok: false, error: 'Subject or body missing' }
  if (!process.env.BREVO_API_KEY) return { ok: false, error: 'BREVO_API_KEY not configured' }

  const html = (d.message_body as string)
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 14px;font:15px/1.55 -apple-system,system-ui,sans-serif;color:#222">${escapeHtml(p)}</p>`)
    .join('')

  try {
    await sendTransactionalEmail({
      to: d.target_email as string,
      subject: d.message_subject as string,
      htmlContent: html,
    })
    await admin
      .from('outreach_drafts')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', draftId)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export async function listEmailDrafts(workspaceId: string): Promise<ColdEmailDraft[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('outreach_drafts')
    .select('id, target_email, target_name, audience_score, reasoning, message_subject, message_body, status, sent_at, reply_at')
    .eq('workspace_id', workspaceId)
    .eq('channel', 'email')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return []
  return (data || []).map((d) => ({
    id: d.id as string,
    handle: '',
    email: d.target_email as string,
    display_name: (d.target_name as string | null) ?? null,
    followers: null,
    audience_score: d.audience_score as number,
    reasoning: d.reasoning as string,
    subject: d.message_subject as string,
    message_body: d.message_body as string,
    status: d.status as string,
    sent_at: d.sent_at as string | null,
    reply_at: d.reply_at as string | null,
  }))
}
