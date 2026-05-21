/**
 * Gating — catastrophic flags that cap the overall score regardless of
 * weighted dimension scores. A page can ace every other dimension yet still
 * be invisible to AI if, say, it blocks every citation bot.
 */
import type { AuditContext, GatingFlag } from './types'
import { parseRobots, isAgentBlocked, AI_BOTS } from './robots'

export function evaluateGating(ctx: AuditContext): GatingFlag[] {
  const flags: GatingFlag[] = []

  // 1. Every AI citation bot blocked → the page cannot be cited at all.
  const groups = ctx.robotsTxt.found ? parseRobots(ctx.robotsTxt.text) : []
  const allBotsBlocked = ctx.robotsTxt.found
    && isAgentBlocked(groups, AI_BOTS.chatgpt)
    && isAgentBlocked(groups, AI_BOTS.perplexity)
    && isAgentBlocked(groups, AI_BOTS.claude)
  flags.push({
    id: 'ai-bots-blocked',
    label: 'All AI crawlers blocked',
    triggered: allBotsBlocked,
    cap: 25,
    detail: allBotsBlocked
      ? 'robots.txt blocks the ChatGPT, Perplexity and Claude crawlers'
      : undefined,
  })

  // 2. Page-level noindex → excluded from every index, never citable.
  let metaNoindex = false
  ctx.$('meta[name="robots"], meta[name="googlebot"]').each((_, el) => {
    if ((ctx.$(el).attr('content') || '').toLowerCase().includes('noindex')) metaNoindex = true
  })
  const headerNoindex = (ctx.headers['x-robots-tag'] || '').toLowerCase().includes('noindex')
  const noindex = metaNoindex || headerNoindex
  flags.push({
    id: 'noindex',
    label: 'Page-wide noindex',
    triggered: noindex,
    cap: 30,
    detail: noindex ? 'The page is marked noindex' : undefined,
  })

  // 3. Not fully analyzable — error status, or a client-rendered shell.
  const unreachable = ctx.status >= 400
  const spa = ctx.isSPA
  flags.push({
    id: 'not-analyzable',
    label: 'Page not fully analyzable (404 / SPA shell)',
    triggered: unreachable || spa,
    cap: unreachable ? 0 : 60,
    detail: unreachable
      ? `Page returned HTTP ${ctx.status}`
      : spa
        ? 'Page renders client-side — only the HTML shell could be analyzed'
        : undefined,
  })

  return flags
}
