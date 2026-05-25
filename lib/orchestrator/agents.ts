/**
 * Traced agent wrappers.
 *
 * Every agent module's run<X>() function gets a `traced<X>()` counterpart
 * here that writes a gtm_tasks row before/after the call. Chat orchestrator
 * + playbooks + route handlers all call through this layer, so the task
 * ledger always reflects reality without leaking tracing concerns into the
 * pure agent modules.
 */
import { recordTask, type RecordedTask } from './tasks'
import type { TaskTrigger, TaskKind } from './types'
import type { Workspace } from '@/lib/workspace/types'

import { runIcpAgent, type IcpRunInput, type IcpRunOutput } from '@/lib/agents/icp'
import { trainVoice, type VoiceTrainInput, type VoiceTrainOutput } from '@/lib/agents/voice'
import { runLandingDoctor, type LandingReport } from '@/lib/agents/landing'
import { runCreatorOutreach, type CreatorRunInput, type CreatorRunOutput } from '@/lib/agents/creator'
import { runColdEmailAgent, type ColdEmailRunInput, type ColdEmailRunOutput } from '@/lib/agents/cold-email'
import { runDistribution, type DistributionRunInput, type DistributionRunOutput } from '@/lib/agents/distribution'
import { runRadar, type RadarRunInput, type RadarRunOutput } from '@/lib/agents/radar'
import { createAbTest, type CreateTestInput, type AbTest } from '@/lib/agents/ab'
import { runCompetitorWatch, type WatchRunInput, type WatchRunOutput } from '@/lib/agents/competitor'
import { runAudit, type AuditResult } from '@/lib/audit'

export interface TraceCtx {
  workspace_id?: string | null
  conversation_id?: string | null
  parent_task_id?: string | null
  triggered_by?: TaskTrigger
}

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

// ── ICP ────────────────────────────────────────────────────────────────────
export async function tracedIcp(input: IcpRunInput, ctx: TraceCtx): Promise<RecordedTask<IcpRunOutput>> {
  return recordTask<IcpRunOutput>({
    kind: 'icp',
    workspace_id: ctx.workspace_id ?? input.workspace.id,
    conversation_id: ctx.conversation_id,
    parent_task_id: ctx.parent_task_id,
    triggered_by: ctx.triggered_by ?? 'manual_page',
    input: { brief: input.brief },
    summary: 'Drafting ICP + positioning…',
    summaryFromResult: (r) => r.positioning?.slice(0, 100) || r.icp_summary?.slice(0, 100) || 'ICP draft',
  }, () => runIcpAgent(input))
}

// ── Voice ──────────────────────────────────────────────────────────────────
export async function tracedVoice(input: VoiceTrainInput & { workspace?: Workspace }, ctx: TraceCtx): Promise<RecordedTask<VoiceTrainOutput>> {
  return recordTask<VoiceTrainOutput>({
    kind: 'voice',
    workspace_id: ctx.workspace_id ?? input.workspace?.id ?? null,
    conversation_id: ctx.conversation_id,
    parent_task_id: ctx.parent_task_id,
    triggered_by: ctx.triggered_by ?? 'manual_page',
    input: { handle: input.handle, extra_count: input.extraSamples?.length ?? 0 },
    summary: `Training voice profile from @${input.handle}…`,
    summaryFromResult: (r) => r.voice.summary?.slice(0, 120) || `Trained on ${r.sourceCount} samples`,
  }, () => trainVoice(input))
}

// ── Landing ────────────────────────────────────────────────────────────────
export async function tracedLanding(input: { workspace: Workspace; url?: string }, ctx: TraceCtx): Promise<RecordedTask<LandingReport>> {
  return recordTask<LandingReport>({
    kind: 'landing',
    workspace_id: ctx.workspace_id ?? input.workspace.id,
    conversation_id: ctx.conversation_id,
    parent_task_id: ctx.parent_task_id,
    triggered_by: ctx.triggered_by ?? 'manual_page',
    input: { url: input.url || input.workspace.url },
    summary: `Conversion audit of ${host(input.url || input.workspace.url)}…`,
    summaryFromResult: (r) => `${host(r.url)}: ${r.overall_score}/100 (${r.grade})`,
  }, () => runLandingDoctor(input))
}

// ── Creator Outreach ───────────────────────────────────────────────────────
export async function tracedCreator(input: CreatorRunInput, ctx: TraceCtx): Promise<RecordedTask<CreatorRunOutput>> {
  return recordTask<CreatorRunOutput>({
    kind: 'creator_outreach',
    workspace_id: ctx.workspace_id ?? input.workspace.id,
    conversation_id: ctx.conversation_id,
    parent_task_id: ctx.parent_task_id,
    triggered_by: ctx.triggered_by ?? 'manual_page',
    input: { picks: input.picks, notes: input.notes },
    summary: `Drafting ${input.picks ?? 12} creator DMs…`,
    summaryFromResult: (r) => `Drafted ${r.drafts.length} DMs (pool ${r.candidatePoolSize})`,
  }, () => runCreatorOutreach(input))
}

// ── Cold Email ─────────────────────────────────────────────────────────────
export async function tracedColdEmail(input: ColdEmailRunInput, ctx: TraceCtx): Promise<RecordedTask<ColdEmailRunOutput>> {
  return recordTask<ColdEmailRunOutput>({
    kind: 'cold_email',
    workspace_id: ctx.workspace_id ?? input.workspace.id,
    conversation_id: ctx.conversation_id,
    parent_task_id: ctx.parent_task_id,
    triggered_by: ctx.triggered_by ?? 'manual_page',
    input: { target_count: input.targets.length, campaign_note: input.campaignNote },
    summary: `Drafting ${input.targets.length} cold emails…`,
    summaryFromResult: (r) => `Drafted ${r.drafts.length} cold emails`,
  }, () => runColdEmailAgent(input))
}

// ── Distribution ───────────────────────────────────────────────────────────
export async function tracedDistribution(input: DistributionRunInput, ctx: TraceCtx): Promise<RecordedTask<DistributionRunOutput>> {
  return recordTask<DistributionRunOutput>({
    kind: 'distribution',
    workspace_id: ctx.workspace_id ?? input.workspace.id,
    conversation_id: ctx.conversation_id,
    parent_task_id: ctx.parent_task_id,
    triggered_by: ctx.triggered_by ?? 'manual_page',
    input: { topic: input.topic.slice(0, 200), platforms: input.platforms },
    summary: `Generating platform variants for: ${input.topic.slice(0, 60)}…`,
    summaryFromResult: (r) => r.post ? `${Object.keys(r.post.variants || {}).length} variants generated` : 'No variants',
  }, () => runDistribution(input))
}

// ── Radar ──────────────────────────────────────────────────────────────────
export async function tracedRadar(input: RadarRunInput, ctx: TraceCtx): Promise<RecordedTask<RadarRunOutput>> {
  return recordTask<RadarRunOutput>({
    kind: 'radar',
    workspace_id: ctx.workspace_id ?? input.workspace.id,
    conversation_id: ctx.conversation_id,
    parent_task_id: ctx.parent_task_id,
    triggered_by: ctx.triggered_by ?? 'manual_page',
    input: { notes: input.notes },
    summary: 'Scanning Reddit + HN for relevant posts…',
    summaryFromResult: (r) => `${r.inserted} new leads (scanned ${r.scanned})`,
  }, () => runRadar(input))
}

// ── A/B ────────────────────────────────────────────────────────────────────
export async function tracedAbCreate(input: CreateTestInput, ctx: TraceCtx): Promise<RecordedTask<AbTest | { error: string }>> {
  return recordTask({
    kind: 'ab',
    workspace_id: ctx.workspace_id ?? input.workspaceId,
    conversation_id: ctx.conversation_id,
    parent_task_id: ctx.parent_task_id,
    triggered_by: ctx.triggered_by ?? 'manual_page',
    input: { name: input.name, target_url: input.targetUrl, variant_count: input.copies.length },
    summary: `Creating A/B test "${input.name}"…`,
    summaryFromResult: (r) => 'error' in (r as Record<string, unknown>) ? `A/B failed: ${(r as { error: string }).error}` : `A/B test "${input.name}" live`,
  }, () => createAbTest(input))
}

// ── Competitor ─────────────────────────────────────────────────────────────
export async function tracedCompetitor(input: WatchRunInput, ctx: TraceCtx): Promise<RecordedTask<WatchRunOutput>> {
  return recordTask<WatchRunOutput>({
    kind: 'competitor',
    workspace_id: ctx.workspace_id ?? input.workspace.id,
    conversation_id: ctx.conversation_id,
    parent_task_id: ctx.parent_task_id,
    triggered_by: ctx.triggered_by ?? 'manual_page',
    input: { diff: input.diff !== false },
    summary: `Watching ${(input.workspace.competitors || []).length} competitor URL(s)…`,
    summaryFromResult: (r) => `${r.snapshots} snapshot(s), ${r.diffs} change(s)`,
  }, () => runCompetitorWatch(input))
}

// ── GEO audit (no workspace needed) ────────────────────────────────────────
export async function tracedGeoAudit(url: string, ctx: TraceCtx): Promise<RecordedTask<AuditResult>> {
  return recordTask<AuditResult>({
    kind: 'geo_audit',
    workspace_id: ctx.workspace_id,
    conversation_id: ctx.conversation_id,
    parent_task_id: ctx.parent_task_id,
    triggered_by: ctx.triggered_by ?? 'chat',
    input: { url },
    summary: `GEO audit of ${host(url)}…`,
    summaryFromResult: (r) => `${host(r.url)}: ${r.overall_score}/100 (${r.grade})`,
  }, () => runAudit(url))
}

/** Map agent → traced function (useful for playbook step dispatch). */
export const TRACED_AGENTS = {
  icp: tracedIcp,
  voice: tracedVoice,
  landing: tracedLanding,
  creator_outreach: tracedCreator,
  cold_email: tracedColdEmail,
  distribution: tracedDistribution,
  radar: tracedRadar,
  ab: tracedAbCreate,
  competitor: tracedCompetitor,
  geo_audit: tracedGeoAudit,
} satisfies Record<Exclude<TaskKind, 'playbook' | 'chat_turn'>, unknown>
