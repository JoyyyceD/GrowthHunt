/** Crawler Access — can AI citation bots actually fetch this page? */
import type { AuditContext, Check, Dimension } from '../types'
import { mkCheck, buildDimension } from './_helpers'
import { parseRobots, isAgentBlocked, AI_BOTS } from '../robots'

const META = { id: 'crawler-access', label: 'Crawler Access', weight: 13, version: '1.0.0' }

function hasMetaNoindex(ctx: AuditContext): boolean {
  let noindex = false
  ctx.$('meta[name="robots"], meta[name="googlebot"]').each((_, el) => {
    if ((ctx.$(el).attr('content') || '').toLowerCase().includes('noindex')) noindex = true
  })
  return noindex
}

function looksBotWalled(ctx: AuditContext): boolean {
  if (ctx.status !== 403 && ctx.status !== 503 && ctx.status !== 429) return false
  const hay = (ctx.html || '').toLowerCase()
  return (
    hay.includes('just a moment')
    || hay.includes('cf-browser-verification')
    || hay.includes('checking your browser')
    || hay.includes('enable javascript and cookies')
    || 'cf-mitigated' in ctx.headers
  )
}

export const crawlerAccess: Dimension = {
  ...META,
  run(ctx: AuditContext) {
    const groups = ctx.robotsTxt.found ? parseRobots(ctx.robotsTxt.text) : []
    const checks: Check[] = []

    checks.push(mkCheck(
      'robots-exists', 'robots.txt present', 10,
      ctx.robotsTxt.found ? 'pass' : 'partial',
      ctx.robotsTxt.found
        ? { detail: 'robots.txt found' }
        : { detail: 'No robots.txt — crawlers assume full access', fix: 'Add a robots.txt that explicitly allows AI crawlers' },
    ))

    const bots: Array<{ id: string; label: string; bot: string; max: number }> = [
      { id: 'chatgpt-bot', label: 'ChatGPT crawler (OAI-SearchBot) allowed', bot: AI_BOTS.chatgpt, max: 15 },
      { id: 'perplexity-bot', label: 'Perplexity crawler (PerplexityBot) allowed', bot: AI_BOTS.perplexity, max: 15 },
      { id: 'claude-bot', label: 'Claude crawler (ClaudeBot) allowed', bot: AI_BOTS.claude, max: 15 },
      { id: 'gemini-bot', label: 'Gemini crawler (Google-Extended) allowed', bot: AI_BOTS.gemini, max: 10 },
    ]
    for (const { id, label, bot, max } of bots) {
      const blocked = ctx.robotsTxt.found && isAgentBlocked(groups, bot)
      checks.push(mkCheck(id, label, max, blocked ? 'fail' : 'pass',
        blocked
          ? { detail: `${bot} is disallowed in robots.txt`, fix: `Remove the Disallow: / rule under User-agent: ${bot}` }
          : { detail: `${bot} can crawl the site` },
      ))
    }

    const noindex = hasMetaNoindex(ctx)
    checks.push(mkCheck('meta-noindex', 'No meta robots noindex', 15, noindex ? 'fail' : 'pass',
      noindex
        ? { detail: 'Page carries a noindex robots meta tag', fix: 'Remove <meta name="robots" content="noindex">' }
        : {},
    ))

    const xNoindex = (ctx.headers['x-robots-tag'] || '').toLowerCase().includes('noindex')
    checks.push(mkCheck('x-robots-tag', 'No X-Robots-Tag noindex', 10, xNoindex ? 'fail' : 'pass',
      xNoindex
        ? { detail: 'X-Robots-Tag response header sends noindex', fix: 'Remove noindex from the X-Robots-Tag header' }
        : {},
    ))

    const httpOk = ctx.status >= 200 && ctx.status < 300
    checks.push(mkCheck('http-status', 'HTTP status OK', 15, httpOk ? 'pass' : 'fail',
      { detail: `HTTP ${ctx.status}` },
    ))

    const walled = looksBotWalled(ctx)
    checks.push(mkCheck('bot-wall', 'Not blocked by a bot firewall', 12, walled ? 'fail' : 'pass',
      walled
        ? { detail: 'Page appears to sit behind a bot challenge (Cloudflare etc.)', fix: 'Allowlist AI crawler user-agents in your WAF / bot protection' }
        : {},
    ))

    return buildDimension(META, checks)
  },
}
