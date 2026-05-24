/**
 * POST /api/geo/apply-fixes
 *
 * Body: { url: string, repo: "owner/name", token: string, baseBranch?: string }
 *
 * Re-runs (or pulls cached) audit for url, then opens a PR on the target
 * repo that adds the audit report + a Claude Code slash command. The PAT
 * is used once and never persisted.
 *
 * The endpoint logs an audit row (without the token) for support.
 */
import { NextRequest, NextResponse } from 'next/server'
import { normalizeUrl, runAudit } from '@/lib/audit'
import { getCachedAudit, saveAudit } from '@/lib/geo/cache'
import { openGeoPr } from '@/lib/geo/github-pr'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkUsage } from '@/lib/geo/usage'
import { getClientIp, ipHash } from '@/lib/ip-hash'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const APPLY_DAILY_LIMIT = 3   // even with a PAT, cap to prevent runaway PRs

async function logPr(opts: {
  url: string
  repo: string
  branch: string
  pr_url: string | null
  status: 'opened' | 'error'
  error?: string
  changes: unknown[]
}) {
  try {
    const admin = createAdminClient()
    await admin.from('geo_pr_requests').insert({
      url: opts.url,
      repo: opts.repo,
      branch: opts.branch,
      pr_url: opts.pr_url,
      status: opts.status,
      error: opts.error || null,
      changes: opts.changes,
    })
  } catch (err) {
    console.error('[geo-pr] log failed:', (err as Error).message)
  }
}

export async function POST(req: NextRequest) {
  let body: { url?: string; repo?: string; token?: string; baseBranch?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const rawUrl = (body.url || '').trim()
  const repo = (body.repo || '').trim()
  const token = (body.token || '').trim()
  const baseBranch = body.baseBranch?.trim() || undefined

  if (!rawUrl) return NextResponse.json({ error: 'Please supply the URL you audited' }, { status: 400 })
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return NextResponse.json({ error: 'Repo must look like owner/name' }, { status: 400 })
  if (!token || !/^(ghp_|github_pat_)/.test(token)) return NextResponse.json({ error: 'Token must be a GitHub PAT (starts with ghp_ or github_pat_)' }, { status: 400 })

  let normalized: string
  try {
    normalized = normalizeUrl(rawUrl)
  } catch {
    return NextResponse.json({ error: 'That URL looks invalid' }, { status: 400 })
  }

  try {
    const key = `pr-ip:${ipHash(getClientIp(req))}`
    const usage = await checkUsage(key, APPLY_DAILY_LIMIT)
    if (!usage.allowed) {
      return NextResponse.json({ error: 'limit', used: usage.used, limit: usage.limit }, { status: 429 })
    }
  } catch {
    // salt missing — allow
  }

  let audit = await getCachedAudit(normalized)
  if (!audit) {
    try {
      audit = await runAudit(normalized)
      if (audit.status !== 'error') await saveAudit(normalized, audit)
    } catch (err) {
      return NextResponse.json({ error: `Audit failed: ${(err as Error).message}` }, { status: 500 })
    }
  }
  if (!audit || audit.status === 'error') {
    return NextResponse.json({ error: 'Could not produce an audit to attach to the PR.' }, { status: 422 })
  }

  try {
    const out = await openGeoPr({ token, repo, baseBranch, audit })
    await logPr({
      url: normalized,
      repo,
      branch: out.branch,
      pr_url: out.prUrl,
      status: 'opened',
      changes: out.filesAdded.map((path) => ({ path, action: 'added' })),
    })
    return NextResponse.json({ ok: true, prUrl: out.prUrl, branch: out.branch, files: out.filesAdded })
  } catch (err) {
    const message = (err as Error).message
    await logPr({
      url: normalized,
      repo,
      branch: '',
      pr_url: null,
      status: 'error',
      error: message,
      changes: [],
    })
    return NextResponse.json({ error: `GitHub error: ${message}` }, { status: 502 })
  }
}
