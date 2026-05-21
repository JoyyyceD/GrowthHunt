/** robots.txt parsing for AI-crawler access checks. */

export interface RobotsGroup {
  agents: string[]
  disallow: string[]
  allow: string[]
}

/** AI citation crawlers we score, keyed by the engine they feed. */
export const AI_BOTS = {
  chatgpt: 'OAI-SearchBot',
  perplexity: 'PerplexityBot',
  claude: 'ClaudeBot',
  gemini: 'Google-Extended',
} as const

export function parseRobots(txt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = []
  let current: RobotsGroup | null = null
  let lastWasAgent = false

  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const field = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()

    if (field === 'user-agent') {
      // consecutive User-agent lines share one group
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }

    lastWasAgent = false
    if (!current) continue
    if (field === 'disallow') current.disallow.push(value)
    else if (field === 'allow') current.allow.push(value)
  }
  return groups
}

/** The group that applies to a bot: an exact match wins over the '*' group. */
function applicableGroup(groups: RobotsGroup[], botLc: string): RobotsGroup | undefined {
  return groups.find((g) => g.agents.includes(botLc))
    ?? groups.find((g) => g.agents.includes('*'))
}

/** True if the bot is effectively disallowed from the site root. */
export function isAgentBlocked(groups: RobotsGroup[], bot: string): boolean {
  const group = applicableGroup(groups, bot.toLowerCase())
  if (!group) return false
  const blocksRoot = group.disallow.some((d) => d === '/' || d === '/*')
  const allowsRoot = group.allow.some((a) => a === '/' || a === '/*')
  return blocksRoot && !allowsRoot
}

/** Sitemap URLs declared via global `Sitemap:` directives. */
export function sitemapDirectives(txt: string): string[] {
  const out: string[] = []
  for (const raw of txt.split(/\r?\n/)) {
    const m = /^\s*sitemap:\s*(.+)$/i.exec(raw.replace(/#.*$/, ''))
    if (m) out.push(m[1]!.trim())
  }
  return out
}
