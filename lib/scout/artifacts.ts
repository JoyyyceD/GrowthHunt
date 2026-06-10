/**
 * Artifact store — Scout's knowledge-base documents (agent_artifacts table).
 *
 * Single write path: every update snapshots the previous revision before
 * bumping rev (decision 2.2 / 3.8 — view-only history, no diff/rollback).
 * All writes go through the server (service role); the browser reads via RLS.
 */
import { createAdminClient } from '@/lib/supabase/admin'

export interface Artifact {
  id: string
  workspace_id: string
  slug: string
  title: string
  kind: string
  content_md: string
  summary: string | null
  rev: number
  created_by: string
  task_id: string | null
  created_at: string
  updated_at: string
}

export interface ArtifactMeta {
  slug: string
  title: string
  summary: string | null
  rev: number
  updated_at: string
}

function hydrate(row: Record<string, unknown>): Artifact {
  return row as unknown as Artifact
}

export async function listArtifacts(workspaceId: string): Promise<ArtifactMeta[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('agent_artifacts')
    .select('slug, title, summary, rev, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
  return (data || []) as ArtifactMeta[]
}

export async function readArtifact(workspaceId: string, slug: string): Promise<Artifact | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('agent_artifacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('slug', slug)
    .maybeSingle()
  return data ? hydrate(data) : null
}

export interface UpsertArtifactInput {
  workspaceId: string
  slug: string
  title: string
  contentMd: string
  summary?: string | null
  taskId?: string | null
  createdBy?: 'agent' | 'user'
}

/** Create or revise. Existing artifact → snapshot old content, rev+1. */
export async function upsertArtifact(input: UpsertArtifactInput): Promise<Artifact | null> {
  const admin = createAdminClient()
  const existing = await readArtifact(input.workspaceId, input.slug)

  if (!existing) {
    const { data, error } = await admin
      .from('agent_artifacts')
      .insert({
        workspace_id: input.workspaceId,
        slug: input.slug,
        title: input.title,
        content_md: input.contentMd,
        summary: input.summary ?? null,
        task_id: input.taskId ?? null,
        created_by: input.createdBy ?? 'agent',
      })
      .select('*')
      .single()
    if (error) {
      console.error('[scout] artifact insert failed:', error.message)
      return null
    }
    return hydrate(data)
  }

  const { error: snapErr } = await admin.from('agent_artifact_revisions').insert({
    artifact_id: existing.id,
    rev: existing.rev,
    content_md: existing.content_md,
  })
  if (snapErr && !snapErr.message.includes('duplicate')) {
    console.error('[scout] revision snapshot failed:', snapErr.message)
  }
  const { data, error } = await admin
    .from('agent_artifacts')
    .update({
      title: input.title,
      content_md: input.contentMd,
      summary: input.summary ?? existing.summary,
      task_id: input.taskId ?? existing.task_id,
      rev: existing.rev + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select('*')
    .single()
  if (error) {
    console.error('[scout] artifact update failed:', error.message)
    return null
  }
  return hydrate(data)
}

export async function listRevisions(workspaceId: string, slug: string): Promise<Array<{ rev: number; content_md: string; created_at: string }>> {
  const artifact = await readArtifact(workspaceId, slug)
  if (!artifact) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('agent_artifact_revisions')
    .select('rev, content_md, created_at')
    .eq('artifact_id', artifact.id)
    .order('rev', { ascending: false })
  return data || []
}

/** Compact context block for the loop: titles + summaries (decision 4.6). */
export async function artifactContextBlock(workspaceId: string): Promise<string> {
  const metas = await listArtifacts(workspaceId)
  if (!metas.length) return ''
  return metas
    .map(m => `- ${m.slug} (rev ${m.rev}): ${m.summary || m.title}`)
    .join('\n')
}
