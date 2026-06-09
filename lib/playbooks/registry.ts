/**
 * Playbook registry — compatibility shim.
 *
 * Playbooks were merged into the unified workflow registry (lib/workflows).
 * "Playbooks" are now simply workflows with category='playbook'. This shim
 * preserves the original listPlaybooks()/findPlaybook() surface so existing
 * callers (the /gtm/playbooks pages, the playbook API route, the orchestrator
 * start_playbook tool) keep working unchanged.
 */
import { WORKFLOWS, findWorkflow } from '@/lib/workflows/registry'
import type { TaskKind } from '@/lib/orchestrator/types'

export interface PlaybookStepView {
  id: string
  kind: TaskKind | string
  label: string
}
export interface PlaybookView {
  id: string
  name: string
  description: string
  estimatedMinutes: number
  steps: PlaybookStepView[]
}

function isPlaybook(category?: string): boolean {
  return category === 'playbook'
}

export function listPlaybooks(): Pick<PlaybookView, 'id' | 'name' | 'description' | 'estimatedMinutes'>[] {
  return WORKFLOWS
    .filter((w) => isPlaybook(w.category))
    .map(({ id, name, description, estimatedMinutes }) => ({ id, name, description, estimatedMinutes }))
}

export function findPlaybook(id: string): PlaybookView | undefined {
  const wf = findWorkflow(id)
  if (!wf || !isPlaybook(wf.category)) return undefined
  return {
    id: wf.id,
    name: wf.name,
    description: wf.description,
    estimatedMinutes: wf.estimatedMinutes,
    // Surface the underlying agent kind (icp, voice, …) as the step label,
    // matching the pre-merge playbook detail view.
    steps: wf.steps.map((s) => ({ id: s.id, kind: s.agentKind ?? s.kind, label: s.label })),
  }
}
