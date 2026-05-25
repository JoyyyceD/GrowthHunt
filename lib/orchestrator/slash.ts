/**
 * Slash command dispatcher — parses `/cmd args` to a direct tool call so power
 * users can bypass the ReAct classifier.
 *
 * Pattern from ClaudeCode src/commands.ts: each slash is just a typed shortcut
 * over the same tool registry the loop already exposes. The chat orchestrator
 * detects a leading slash, dispatches the tool directly (still wrapped in a
 * chat_turn task + permission check), and skips classifyStep entirely.
 */
import type { Workspace } from '@/lib/workspace/types'

export interface SlashCommandResolved {
  /** Tool name to invoke. Must exist in the tool registry. */
  tool: string
  /** Params for the tool. */
  params: Record<string, unknown>
  /** Human-readable form of what we resolved (for the trace step). */
  resolvedAs: string
}

export interface SlashCommandUnresolved {
  /** The /name typed by the user, no leading slash. */
  name: string
  rest: string
  error: string
}

export type SlashCommandResult = SlashCommandResolved | SlashCommandUnresolved

const KNOWN: Record<string, {
  description: string
  build: (rest: string, ws: Workspace) => { tool: string; params: Record<string, unknown>; resolvedAs: string } | { error: string }
}> = {
  audit: {
    description: '/audit [url] — quick GEO/AI citation audit (defaults to workspace url)',
    build: (rest, ws) => ({
      tool: 'quick_geo_audit',
      params: { url: rest.trim() || ws.url },
      resolvedAs: `GEO audit ${rest.trim() || ws.url}`,
    }),
  },
  landing: {
    description: '/landing [url] — landing-page conversion audit',
    build: (rest, ws) => ({
      tool: 'landing_audit',
      params: { url: rest.trim() || ws.url },
      resolvedAs: `landing audit ${rest.trim() || ws.url}`,
    }),
  },
  icp: {
    description: '/icp [brief] — re-run ICP/positioning draft',
    build: (rest) => ({
      tool: 'run_icp_agent',
      params: rest.trim() ? { brief: rest.trim() } : {},
      resolvedAs: 'ICP draft',
    }),
  },
  voice: {
    description: '/voice <handle> — train founder voice from an X handle',
    build: (rest) => {
      const h = rest.trim().replace(/^@/, '')
      if (!h) return { error: '/voice needs an X handle' }
      return { tool: 'train_voice', params: { handle: h }, resolvedAs: `train voice on @${h}` }
    },
  },
  creators: {
    description: '/creators [N] [notes] — draft N creator DMs (default 6)',
    build: (rest) => {
      const m = rest.trim().match(/^(\d+)?\s*(.*)$/)
      const picks = m && m[1] ? Math.min(12, Math.max(3, Number(m[1]))) : 6
      const notes = (m?.[2] ?? '').trim()
      return { tool: 'draft_creator_outreach', params: notes ? { picks, notes } : { picks }, resolvedAs: `draft ${picks} creator DMs` }
    },
  },
  competitors: {
    description: '/competitors — snapshot + diff competitor URLs',
    build: () => ({ tool: 'competitor_scan', params: {}, resolvedAs: 'competitor scan' }),
  },
  radar: {
    description: '/radar [notes] — scan Reddit + HN for ICP-relevant posts',
    build: (rest) => ({ tool: 'radar_scan', params: rest.trim() ? { notes: rest.trim() } : {}, resolvedAs: 'radar scan' }),
  },
  workspace: {
    description: '/workspace — show ICP / voice / positioning summary',
    build: () => ({ tool: 'get_workspace', params: {}, resolvedAs: 'show workspace' }),
  },
  runs: {
    description: '/runs [N] — recent agent runs (default 10)',
    build: (rest) => {
      const n = Number(rest.trim()); const limit = Number.isFinite(n) && n > 0 ? Math.min(30, n) : 10
      return { tool: 'list_recent_runs', params: { limit }, resolvedAs: `last ${limit} runs` }
    },
  },
  trends: {
    description: '/trends — refresh today\'s trend-digest drafts',
    build: () => ({ tool: 'daily_trend_digest', params: {}, resolvedAs: 'trend digest' }),
  },
  roi: {
    description: '/roi — refresh post ROI digest',
    build: () => ({ tool: 'post_roi_digest', params: {}, resolvedAs: 'post ROI digest' }),
  },
  playbook: {
    description: '/playbook <id> [topic] — run a playbook (onboarding, weekly_review, launch_post, find_first_100, pre_launch_geo_pass)',
    build: (rest) => {
      const [id, ...rest2] = rest.trim().split(/\s+/)
      if (!id) return { error: '/playbook needs a playbook id' }
      const topic = rest2.join(' ').trim()
      return { tool: 'start_playbook', params: topic ? { playbook_id: id, topic } : { playbook_id: id }, resolvedAs: `playbook ${id}` }
    },
  },
  workflow: {
    description: '/workflow <id> — start a workflow (daily_content_sprint, ship_a_feature, find_customers, defend_position)',
    build: (rest) => {
      const id = rest.trim().split(/\s+/)[0]
      if (!id) return { error: '/workflow needs an id' }
      return { tool: 'start_workflow', params: { workflow_id: id }, resolvedAs: `workflow ${id}` }
    },
  },
  help: {
    description: '/help — list available slash commands',
    build: () => ({ tool: 'answer', params: { reply: slashHelp() }, resolvedAs: 'slash help' }),
  },
}

export function slashHelp(): string {
  return [
    'Available slash commands:',
    ...Object.values(KNOWN).map((c) => `- ${c.description}`),
    '',
    'Anything without a leading `/` goes through the GTM orchestrator as usual.',
  ].join('\n')
}

/** Returns null when the message is not a slash command. */
export function parseSlashCommand(message: string, ws: Workspace): SlashCommandResult | null {
  const trimmed = message.trim()
  if (!trimmed.startsWith('/')) return null
  const m = trimmed.match(/^\/([a-zA-Z_-]+)\s*([\s\S]*)$/)
  if (!m) return null
  const name = m[1].toLowerCase()
  const rest = m[2] ?? ''
  const cmd = KNOWN[name]
  if (!cmd) {
    return { name, rest, error: `Unknown command /${name}. Try /help.` }
  }
  const built = cmd.build(rest, ws)
  if ('error' in built) {
    return { name, rest, error: built.error }
  }
  return built
}

export function listSlashCommands(): Array<{ name: string; description: string }> {
  return Object.entries(KNOWN).map(([name, c]) => ({ name, description: c.description }))
}
