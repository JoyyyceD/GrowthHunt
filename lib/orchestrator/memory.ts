/**
 * Letta-style 3-layer memory for the GTM orchestrator.
 *
 *   - CORE     — small (~4 KB) workspace block, always injected into prompts.
 *                Sections like "founder", "current_goal", "do_not_do".
 *   - ARCHIVAL — long-form facts the agent decides to keep across sessions,
 *                retrieved by cosine similarity over OpenAI text-embedding-3-small.
 *   - RECALL   — full message history (gtm_messages), already handled
 *                elsewhere; not duplicated here.
 *
 * Public surface:
 *   listCore(ws)             → array of {label, content}
 *   coreBlock(ws)            → formatted prompt string (for triage + loop)
 *   upsertCore(ws, label, content)
 *   deleteCore(ws, label)
 *   insertArchival(ws, content, source?, tags?)
 *   searchArchival(ws, query, k?)
 *   recentArchival(ws, k?)
 */
import { createAdminClient } from '@/lib/supabase/admin'

const EMBED_MODEL = 'text-embedding-3-small'   // 1536-d, cheap, multilingual
const EMBED_ENDPOINT = 'https://api.openai.com/v1/embeddings'
const CORE_LABEL_MAX = 32
const CORE_CONTENT_MAX = 1200                  // per section
const CORE_TOTAL_BUDGET = 4000                 // hard cap on coreBlock() output
const ARCHIVAL_CONTENT_MAX = 4000

export interface CoreMemoryRow {
  label: string
  content: string
  updated_at: string
}

export interface ArchivalMemoryRow {
  id: string
  content: string
  source: string | null
  tags: string[]
  created_at: string
  similarity?: number
}

// ── embeddings ────────────────────────────────────────────────────────────

export async function embed(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key || !text.trim()) return null
  try {
    const res = await fetch(EMBED_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
    })
    if (!res.ok) {
      console.error('[memory] embed failed:', res.status, await res.text().catch(() => ''))
      return null
    }
    const json = await res.json() as { data?: Array<{ embedding?: number[] }> }
    const vec = json.data?.[0]?.embedding
    return Array.isArray(vec) ? vec : null
  } catch (err) {
    console.error('[memory] embed threw:', (err as Error).message)
    return null
  }
}

// ── core memory ────────────────────────────────────────────────────────────

export async function listCore(workspaceId: string): Promise<CoreMemoryRow[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('gtm_memory_core')
      .select('label, content, updated_at')
      .eq('workspace_id', workspaceId)
      .order('label', { ascending: true })
    return (data || []) as CoreMemoryRow[]
  } catch { return [] }
}

/** Formatted block for prompts. Truncated to ~4 KB so it never blows context. */
export async function coreBlock(workspaceId: string): Promise<string> {
  const rows = await listCore(workspaceId)
  if (rows.length === 0) return ''
  const parts: string[] = []
  let used = 0
  for (const r of rows) {
    const chunk = `[${r.label}] ${r.content.trim()}`
    if (used + chunk.length > CORE_TOTAL_BUDGET) break
    parts.push(chunk)
    used += chunk.length + 1
  }
  return parts.join('\n')
}

export async function upsertCore(workspaceId: string, label: string, content: string): Promise<CoreMemoryRow | null> {
  const cleanLabel = label.trim().slice(0, CORE_LABEL_MAX).replace(/\s+/g, '_').toLowerCase()
  const cleanContent = content.trim().slice(0, CORE_CONTENT_MAX)
  if (!cleanLabel || !cleanContent) return null
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('gtm_memory_core')
      .upsert({ workspace_id: workspaceId, label: cleanLabel, content: cleanContent }, { onConflict: 'workspace_id,label' })
      .select('label, content, updated_at')
      .single()
    return (data as CoreMemoryRow) ?? null
  } catch (err) {
    console.error('[memory] upsertCore failed:', (err as Error).message)
    return null
  }
}

export async function deleteCore(workspaceId: string, label: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('gtm_memory_core')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('label', label.trim().toLowerCase())
    return !error
  } catch { return false }
}

// ── archival memory ────────────────────────────────────────────────────────

export async function insertArchival(
  workspaceId: string,
  content: string,
  opts: { source?: string; tags?: string[] } = {},
): Promise<ArchivalMemoryRow | null> {
  const text = content.trim().slice(0, ARCHIVAL_CONTENT_MAX)
  if (!text) return null
  const vec = await embed(text)
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('gtm_memory_archival')
      .insert({
        workspace_id: workspaceId,
        content: text,
        embedding: vec,
        source: opts.source ?? 'agent',
        tags: opts.tags ?? [],
      })
      .select('id, content, source, tags, created_at')
      .single()
    return (data as ArchivalMemoryRow) ?? null
  } catch (err) {
    console.error('[memory] insertArchival failed:', (err as Error).message)
    return null
  }
}

export async function searchArchival(workspaceId: string, query: string, k = 5): Promise<ArchivalMemoryRow[]> {
  const vec = await embed(query)
  if (!vec) {
    // Embedding provider unreachable — fall back to ILIKE on most recent rows.
    return recentArchivalByText(workspaceId, query, k)
  }
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('match_gtm_memory', {
      query_embedding: vec,
      match_workspace: workspaceId,
      match_count: Math.min(20, Math.max(1, k)),
      match_threshold: 0.2,
    })
    if (error) {
      console.error('[memory] match RPC failed:', error.message)
      return recentArchivalByText(workspaceId, query, k)
    }
    return (data || []) as ArchivalMemoryRow[]
  } catch (err) {
    console.error('[memory] searchArchival threw:', (err as Error).message)
    return []
  }
}

async function recentArchivalByText(workspaceId: string, query: string, k: number): Promise<ArchivalMemoryRow[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('gtm_memory_archival')
      .select('id, content, source, tags, created_at')
      .eq('workspace_id', workspaceId)
      .ilike('content', `%${query.slice(0, 80)}%`)
      .order('created_at', { ascending: false })
      .limit(k)
    return (data || []) as ArchivalMemoryRow[]
  } catch { return [] }
}

export async function recentArchival(workspaceId: string, k = 10): Promise<ArchivalMemoryRow[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('gtm_memory_archival')
      .select('id, content, source, tags, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(k)
    return (data || []) as ArchivalMemoryRow[]
  } catch { return [] }
}
