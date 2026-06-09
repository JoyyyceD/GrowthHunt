/**
 * Workflow registry. Workflows are the business-process layer above agents.
 *
 * Two categories share this one registry + runner:
 *   - 'process'  → stateful workflows (gates / triggers / artifacts), shown on
 *                  the Workflows page. Default when `category` is omitted.
 *   - 'playbook' → synchronous gate-less agent chains, shown on the Playbooks
 *                  page. Reached through the lib/playbooks compatibility shim.
 */
import { daily_content_sprint } from './daily_content_sprint'
import { ship_a_feature } from './ship_a_feature'
import { find_customers } from './find_customers'
import { defend_position } from './defend_position'
import { onboarding } from './onboarding'
import { weekly_review } from './weekly_review'
import { launch_post } from './launch_post'
import { find_first_100 } from './find_first_100'
import { pre_launch_geo_pass } from './pre_launch_geo_pass'
import type { Workflow } from './types'

export const WORKFLOWS: Workflow[] = [
  // process-class
  daily_content_sprint,
  ship_a_feature,
  find_customers,
  defend_position,
  // playbook-class (synchronous, gate-less)
  onboarding,
  weekly_review,
  launch_post,
  find_first_100,
  pre_launch_geo_pass,
]

export function findWorkflow(id: string): Workflow | undefined {
  return WORKFLOWS.find((w) => w.id === id)
}

/** Workflows shown on the Workflows page (process-class only). */
export function listWorkflows(): Array<Pick<Workflow, 'id' | 'name' | 'description' | 'embodies' | 'estimatedMinutes' | 'outcome' | 'triggers'>> {
  return WORKFLOWS
    .filter((w) => (w.category ?? 'process') !== 'playbook')
    .map(({ id, name, description, embodies, estimatedMinutes, outcome, triggers }) => ({
      id, name, description, embodies, estimatedMinutes, outcome, triggers,
    }))
}
