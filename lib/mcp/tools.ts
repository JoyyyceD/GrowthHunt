/**
 * MCP tool manifest + dispatcher.
 *
 * Exposes a curated subset of GrowthHunt's orchestrator tools to external
 * AI agents (Claude Desktop / ChatGPT / Cursor) over the standard
 * Model Context Protocol. Each tool here is a thin wrapper around the
 * unified schedule service + workspace lookups, scoped to the workspace
 * identified by the inbound Bearer key.
 */
import { unifiedSchedule } from '@/lib/social/schedule'
import { listScheduledPosts } from '@/lib/postiz/store'
import { listConnections } from '@/lib/social/store'
import { getWorkspace } from '@/lib/workspace/store'

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  run(args: Record<string, unknown>, ctx: { workspaceId: string }): Promise<Record<string, unknown>>
}

function s(v: unknown): string { return typeof v === 'string' ? v.trim() : '' }

const tool_schedule_post: McpTool = {
  name: 'schedule_post',
  description: "Schedule or immediately publish a social post to one or more of the user's connected platforms (X / LinkedIn / Reddit, with Postiz fallback). When `when` is omitted, posts immediately.",
  inputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'The exact post text.' },
      platforms: { type: 'array', items: { type: 'string' }, description: 'Platform keys: x | linkedin | reddit (+ Postiz channels).' },
      when: { type: 'string', description: 'ISO 8601 timestamp. Omit to post now.' },
    },
    required: ['content'],
  },
  async run(args, ctx) {
    const content = s(args.content)
    if (!content) return { error: 'content is required' }
    const platforms = Array.isArray(args.platforms) ? args.platforms.map(String) : undefined
    const r = await unifiedSchedule({
      workspaceId: ctx.workspaceId,
      content,
      platforms,
      when: s(args.when) || null,
      source: 'mcp',
    })
    return {
      ok: r.ok,
      summary: r.summary,
      created: r.created.map((c) => ({
        platform: c.platform, status: c.status, scheduled_for: c.scheduled_for, external_post_id: c.external_post_id,
      })),
      errors: r.errors,
      not_connected: r.notConnected,
    }
  },
}

const tool_list_scheduled_posts: McpTool = {
  name: 'list_scheduled_posts',
  description: "Show what's queued or recently posted for this workspace.",
  inputSchema: {
    type: 'object',
    properties: { limit: { type: 'integer', description: '1-30, default 10' } },
  },
  async run(args, ctx) {
    const limit = Math.min(30, Math.max(1, Number(args.limit) || 10))
    const list = await listScheduledPosts(ctx.workspaceId, limit)
    return {
      posts: list.map((p) => ({
        platform: p.platform, status: p.status, scheduled_for: p.scheduled_for, posted_at: p.posted_at,
        content_preview: p.content.slice(0, 280), external_post_id: p.external_post_id, error: p.error,
      })),
    }
  },
}

const tool_list_connections: McpTool = {
  name: 'list_connections',
  description: "List the social accounts connected to this workspace and their status (needs_reconnect, expiry, scopes).",
  inputSchema: { type: 'object', properties: {} },
  async run(_args, ctx) {
    const conns = await listConnections(ctx.workspaceId)
    return {
      connections: conns.map((c) => ({
        platform: c.platform, account_handle: c.account_handle, scopes: c.scopes,
        expires_at: c.expires_at, needs_reconnect: c.needs_reconnect, reconnect_reason: c.reconnect_reason,
      })),
    }
  },
}

const tool_get_workspace: McpTool = {
  name: 'get_workspace',
  description: 'Return the workspace summary (positioning / ICP / voice / competitors).',
  inputSchema: { type: 'object', properties: {} },
  async run(_args, ctx) {
    const ws = await getWorkspace(ctx.workspaceId)
    if (!ws) return { error: 'workspace not found' }
    return {
      name: ws.name, url: ws.url, one_liner: ws.one_liner, positioning: ws.positioning,
      icp_summary: ws.icp_summary, key_messages: ws.key_messages, competitors: ws.competitors,
    }
  },
}

export const MCP_TOOLS: McpTool[] = [tool_schedule_post, tool_list_scheduled_posts, tool_list_connections, tool_get_workspace]

export function findMcpTool(name: string): McpTool | null {
  return MCP_TOOLS.find((t) => t.name === name) ?? null
}
