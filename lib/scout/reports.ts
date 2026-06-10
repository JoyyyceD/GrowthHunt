/**
 * Shareable playbook reports (V2-T1/T2) — private by default, owner flips a
 * switch to publish a read-only public page at /scout/report/[slug].
 * Shared pages are intentionally indexable (decision D5).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspace } from '@/lib/workspace/store'
import { listArtifacts, readArtifact, type Artifact } from './artifacts'
import type { Workspace } from '@/lib/workspace/types'

export interface ShareReport {
  slug: string
  enabled: boolean
  view_count: number
}

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'brand'
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

export async function getReportForWorkspace(workspaceId: string): Promise<ShareReport | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('scout_reports')
    .select('slug, enabled, view_count')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  return (data as ShareReport | null) ?? null
}

/** Create-if-missing, then set enabled. */
export async function setReportEnabled(workspaceId: string, enabled: boolean): Promise<ShareReport | null> {
  const admin = createAdminClient()
  const existing = await getReportForWorkspace(workspaceId)
  if (!existing) {
    const ws = await getWorkspace(workspaceId)
    const { data, error } = await admin
      .from('scout_reports')
      .insert({ workspace_id: workspaceId, slug: slugify(ws?.name || 'brand'), enabled })
      .select('slug, enabled, view_count')
      .single()
    if (error) {
      console.error('[scout] report create failed:', error.message)
      return null
    }
    return data as ShareReport
  }
  const { data } = await admin
    .from('scout_reports')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .select('slug, enabled, view_count')
    .single()
  return (data as ShareReport | null) ?? null
}

export interface PublicReport {
  workspace: Pick<Workspace, 'name' | 'url' | 'one_liner' | 'brand_color'>
  docs: Artifact[]
  view_count: number
}

/** Resolve an enabled public report by slug; counts the view (best-effort). */
export async function getPublicReport(slug: string): Promise<PublicReport | null> {
  const admin = createAdminClient()
  const { data: report } = await admin
    .from('scout_reports')
    .select('workspace_id, enabled, view_count')
    .eq('slug', slug)
    .maybeSingle()
  if (!report || !report.enabled) return null

  const ws = await getWorkspace(report.workspace_id as string)
  if (!ws) return null
  const metas = await listArtifacts(report.workspace_id as string)
  const docs = (
    await Promise.all(metas.map(m => readArtifact(report.workspace_id as string, m.slug)))
  ).filter((d): d is Artifact => !!d)
  if (!docs.length) return null

  void admin
    .from('scout_reports')
    .update({ view_count: (report.view_count as number) + 1 })
    .eq('slug', slug)
    .then(() => {})

  return {
    workspace: { name: ws.name, url: ws.url, one_liner: ws.one_liner ?? null, brand_color: ws.brand_color ?? null },
    docs,
    view_count: report.view_count as number,
  }
}
