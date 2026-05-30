/**
 * Canonical route catalog for the GTM orchestrator.
 *
 * The chat LLM has shown a strong tendency to fabricate URLs ("audit-results",
 * "train-voice", "memory" etc.) when it improvises markdown links. Two
 * mitigations live here:
 *
 *   1. `routeCatalogForPrompt(ws)` — a short, prompt-friendly list of the
 *      EXACT URLs the agent is allowed to link to. Injected into both
 *      triage.ts and loop.ts prompts.
 *   2. `scrubFakeUrls(text, ws)` — last-line defence: a regex pass that
 *      converts any `[label](url)` whose url is not in the allowlist into
 *      plain `label`. Drops `growthhunt.ai/<bare-path>` hallucinations and
 *      preserves real deep links the tools returned.
 */
import type { Workspace } from '@/lib/workspace/types'

/** Static routes that are always valid regardless of workspace. */
const STATIC_ALLOW = [
  '/gtm',
  '/gtm/chat',
  '/gtm/conversations',
  '/gtm/playbooks',
  '/gtm/tasks',
  '/gtm/workflows',
  '/xgrower',
  '/xgrower/install',
  '/xgrower/privacy',
  '/xgrower/redeem',
  '/opchampion',
  '/picolaunch',
  '/picolaunch/submit',
  '/get-backlinks',
  '/velocity',
  '/viralx',
  '/workspace',
  '/agents',
  '/agents/ab',
  '/agents/cold-email',
  '/agents/competitor',
  '/agents/creator',
  '/agents/distribution',
  '/agents/icp',
  '/agents/landing',
  '/agents/launch-orchestrator',
  '/agents/post-roi',
  '/agents/radar',
  '/agents/trend-digest',
  '/agents/video-coach',
  '/agents/voice',
  '/agents/scheduler',
  '/geo',
  '/blog',
  '/login',
]

/** Patterns (no query check) that are always valid — for dynamic segments. */
const ALLOW_PATTERNS: RegExp[] = [
  /^\/gtm\/tasks\/[\w-]+$/,
  /^\/gtm\/workflows\/[\w-]+$/,
  /^\/gtm\/chat\/[\w-]+$/,
  /^\/agents\/launch-orchestrator\/[\w-]+$/,
  /^\/workspace\/[\w-]+$/,
  /^\/blog\/[\w-]+$/,
  /^\/picolaunch\/p\/[\w-]+$/,
]

function isAllowedPath(path: string): boolean {
  // Strip query + hash so /agents/icp?ws=... is allowed.
  const bare = path.split('?')[0].split('#')[0]
  if (STATIC_ALLOW.includes(bare)) return true
  return ALLOW_PATTERNS.some((re) => re.test(bare))
}

/**
 * Decide whether a given URL — bare path or absolute — is one the agent is
 * allowed to surface in markdown. We are strict on growthhunt.ai paths
 * (because the model invents them) but permissive on third-party http(s)
 * URLs the tools may have returned (Reddit threads, X profiles, etc.).
 */
export function isAllowedUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  // Allow our own bare paths
  if (trimmed.startsWith('/')) return isAllowedPath(trimmed)
  // Allow growthhunt.ai links — but ONLY if the path is in the allowlist
  const m = trimmed.match(/^https?:\/\/(?:www\.)?growthhunt\.ai(\/[^\s]*)?$/i)
  if (m) {
    const path = m[1] || '/'
    return isAllowedPath(path)
  }
  // Allow other absolute URLs (third-party — Reddit, X, GitHub, etc.). The
  // tools that return these have already validated them.
  return /^https?:\/\//i.test(trimmed)
}

/**
 * Strip markdown links whose URL is not allow-listed AND normalize allowed
 * URLs (rewrite `https://growthhunt.ai/foo` → `/foo` so they work in dev,
 * and trim stray characters the model sometimes inserts inside the path).
 *
 * Behavior:
 *   - Allowed bare paths: kept verbatim.
 *   - Allowed `growthhunt.ai/path`: rewritten to bare `/path`.
 *   - Third-party absolute URLs: kept verbatim.
 *   - Anything else: link unwrapped — visible label remains as plain text.
 */
export function scrubFakeUrls(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_full, label: string, url: string) => {
    const trimmed = url.trim()
    // growthhunt.ai/<path>  →  /<path>  (provided the path is allow-listed)
    const ghMatch = trimmed.match(/^https?:\/\/(?:www\.)?growthhunt\.ai(\/[^\s]*)?$/i)
    if (ghMatch) {
      const path = ghMatch[1] || '/'
      return isAllowedPath(path) ? `[${label}](${path})` : label
    }
    return isAllowedUrl(trimmed) ? `[${label}](${trimmed})` : label
  })
}

/**
 * Prompt-friendly route catalog. All workspace-scoped routes are pre-filled
 * with the literal id, so the model can copy them verbatim. We avoid `<id>`
 * angle-bracket placeholders because they sometimes break the model's JSON
 * output formatting.
 */
export function routeCatalogForPrompt(ws: Workspace): string {
  const w = ws.id
  return [
    `/gtm                              mission control (this page)`,
    `/gtm/workflows                    workflow runs`,
    `/workspace/${w}                   edit this workspace`,
    `/agents/icp?ws=${w}               ICP & positioning agent`,
    `/agents/voice?ws=${w}             founder voice trainer`,
    `/agents/landing?ws=${w}           landing-page doctor`,
    `/agents/radar?ws=${w}             Reddit + HN community radar`,
    `/agents/competitor?ws=${w}        competitor watch`,
    `/agents/distribution?ws=${w}      multi-platform distribution`,
    `/agents/creator?ws=${w}           creator DM outreach`,
    `/agents/cold-email?ws=${w}        cold-email outreach`,
    `/agents/post-roi?ws=${w}          own-post ROI digest`,
    `/agents/trend-digest?ws=${w}      daily trend digest`,
    `/agents/video-coach?ws=${w}       short-form video scripts`,
    `/agents/ab?ws=${w}                A/B test dashboard`,
    `/agents/scheduler?ws=${w}         schedule + publish posts via Postiz`,
    `/geo                              GEO / AI-citation audit page`,
    `/xgrower                          xgrower product home`,
    `/xgrower/install                  xgrower Chrome extension install`,
    `/velocity                         public leaderboard`,
    `/viralx                           ViralX product page`,
    `/opchampion                       OP Champions vote board`,
    `Note: /gtm/tasks/{task_id} and /agents/launch-orchestrator/{id} only exist AFTER a tool returns the id — never invent these ids.`,
  ].join('\n')
}
