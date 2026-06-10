/**
 * Scout tool registry — the 16 v1 tools (decision 4.1).
 *
 * Tools marked available run today; the rest land with their build-plan task
 * (T3–T6) and are hidden from the model until then. Existing modules are
 * imported as libraries, never modified (decision 4.3).
 */
import { getWorkspace, patchWorkspace } from '@/lib/workspace/store'
import { upsertCore, listCore, searchArchival } from '@/lib/orchestrator/memory'
import { insertScheduledPost, listScheduledPosts } from '@/lib/postiz/store'
import { webSearch, readPage } from './research'
import { listArtifacts, readArtifact, upsertArtifact } from './artifacts'
import { chatStream } from './client'
import type { ScoutTool } from './types'

const PATCHABLE_FIELDS = new Set([
  'name', 'one_liner', 'icp_summary', 'positioning', 'key_messages', 'competitors', 'brand_color', 'emoji',
])

function json(value: unknown): string {
  return JSON.stringify(value, null, 1)
}

export const SCOUT_TOOLS: Record<string, ScoutTool & { available: boolean }> = {
  get_workspace: {
    available: true,
    def: {
      name: 'get_workspace',
      description: "Read the current workspace brain: product, ICP, positioning, key messages, competitors, voice.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
    label: () => 'Checking your workspace…',
    run: async (_params, ctx) => {
      const ws = await getWorkspace(ctx.workspaceId)
      if (!ws) return 'Error: workspace not found'
      const { id, owner_id, ...brain } = ws
      return json(brain)
    },
  },

  update_workspace: {
    available: true,
    def: {
      name: 'update_workspace',
      description: 'Update workspace brain fields. Only pass fields you intend to change.',
      parameters: {
        type: 'object',
        properties: {
          patch: {
            type: 'object',
            description: 'Subset of: name, one_liner, icp_summary, positioning, key_messages (string[]), competitors ({name,url,note}[]), brand_color, emoji',
          },
        },
        required: ['patch'],
      },
    },
    label: () => 'Updating your workspace…',
    run: async (params, ctx) => {
      const raw = (params.patch || {}) as Record<string, unknown>
      const patch: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(raw)) {
        if (PATCHABLE_FIELDS.has(k)) patch[k] = v
      }
      if (!Object.keys(patch).length) return 'Error: no patchable fields provided'
      const ws = await patchWorkspace(ctx.workspaceId, patch)
      return ws ? `Updated: ${Object.keys(patch).join(', ')}` : 'Error: update failed'
    },
  },

  web_search: {
    available: true,
    def: {
      name: 'web_search',
      description: 'Search the web (Google). Returns titles, links, snippets, and an answer box when present.',
      parameters: {
        type: 'object',
        properties: { q: { type: 'string', description: 'search query' } },
        required: ['q'],
      },
    },
    label: p => `Searching: ${String(p.q || '').slice(0, 60)}…`,
    run: async params => {
      const r = await webSearch(String(params.q || ''))
      return json(r)
    },
  },

  fetch_page: {
    available: true,
    def: {
      name: 'fetch_page',
      description: 'Read a web page as clean markdown. Use for pages whose URL you already know.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url'],
      },
    },
    label: p => `Reading ${String(p.url || '').replace(/^https?:\/\//, '').slice(0, 50)}…`,
    run: async params => {
      const r = await readPage(String(params.url || ''))
      return `# ${r.title}\n\n${r.markdown}`
    },
  },

  memory_upsert: {
    available: true,
    def: {
      name: 'memory_upsert',
      description: 'Save a durable note about this workspace (learnings, preferences, decisions).',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'short kebab-case key' },
          content: { type: 'string' },
        },
        required: ['label', 'content'],
      },
    },
    label: () => 'Saving a note…',
    run: async (params, ctx) => {
      const row = await upsertCore(ctx.workspaceId, String(params.label || ''), String(params.content || ''))
      return row ? `Saved note "${row.label}"` : 'Error: save failed'
    },
  },

  memory_search: {
    available: true,
    def: {
      name: 'memory_search',
      description: 'Search saved workspace notes and past learnings.',
      parameters: {
        type: 'object',
        properties: { q: { type: 'string' } },
        required: ['q'],
      },
    },
    label: () => 'Searching my notes…',
    run: async (params, ctx) => {
      const [core, archival] = await Promise.all([
        listCore(ctx.workspaceId),
        searchArchival(ctx.workspaceId, String(params.q || '')).catch(() => []),
      ])
      return json({
        notes: core.map(c => ({ label: c.label, content: c.content })),
        related: archival.map(a => a.content),
      })
    },
  },

  list_scheduled_posts: {
    available: true,
    def: {
      name: 'list_scheduled_posts',
      description: 'List the publish queue: proposed, scheduled, posted and failed posts.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
    label: () => 'Checking the queue…',
    run: async (_params, ctx) => {
      const posts = await listScheduledPosts(ctx.workspaceId, 30)
      return json(posts.map(p => ({
        id: p.id, platform: p.platform, status: p.status,
        scheduled_for: p.scheduled_for,
        content: p.content.length > 140 ? `${p.content.slice(0, 140)}… [preview — full ${p.content.length}-char text exists, it is NOT cut off]` : p.content,
      })))
    },
  },

  schedule_posts: {
    available: true,
    def: {
      name: 'schedule_posts',
      description: "Add post drafts to the publish queue as 'proposed' (user approves before anything goes live).",
      parameters: {
        type: 'object',
        properties: {
          posts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                platform: { type: 'string', description: 'x | linkedin | reddit' },
                content: { type: 'string' },
                scheduled_for: { type: 'string', description: 'ISO timestamp, optional' },
              },
              required: ['platform', 'content'],
            },
          },
        },
        required: ['posts'],
      },
    },
    label: p => `Queueing ${(p.posts as unknown[])?.length || 0} draft(s)…`,
    run: async (params, ctx) => {
      const posts = (params.posts || []) as Array<{ platform: string; content: string; scheduled_for?: string }>
      if (!posts.length) return 'Error: posts array is empty'
      let inserted = 0
      for (const p of posts) {
        const row = await insertScheduledPost({
          workspaceId: ctx.workspaceId,
          postizPostId: null,
          integrationId: '',
          platform: p.platform,
          content: p.content,
          type: 'draft',
          scheduledFor: p.scheduled_for || null,
          // 'proposed' is Scout's pre-approval status; the publish cron only picks
          // up 'scheduled', so these rows are inert until the user approves.
          status: 'proposed' as never,
          source: 'scout',
          conversationId: ctx.conversationId ?? null,
        })
        if (row) inserted++
      }
      ctx.emit({
        type: 'post_drafts',
        drafts: posts.map(p => ({ platform: p.platform, content: p.content, scheduledFor: p.scheduled_for ?? null })),
      })
      return `Queued ${inserted}/${posts.length} draft(s) as proposed`
    },
  },

  ask_user: {
    available: true,
    def: {
      name: 'ask_user',
      description: 'Ask the user to decide something you cannot decide alone. Ends your turn; their answer arrives as the next message.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, description: '2-4 short choices, optional' },
        },
        required: ['question'],
      },
    },
    label: () => 'Asking you…',
    run: async (params, ctx) => {
      ctx.emit({
        type: 'ask_user',
        question: String(params.question || ''),
        options: Array.isArray(params.options) ? (params.options as string[]).slice(0, 4) : undefined,
      })
      return 'ASK_USER_SENT'
    },
  },

}

export function availableTools(): Array<ScoutTool & { available: boolean; key: string }> {
  return Object.entries(SCOUT_TOOLS)
    .filter(([, t]) => t.available)
    .map(([key, t]) => ({ ...t, key }))
}
