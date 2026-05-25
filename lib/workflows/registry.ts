/**
 * Workflow registry. Workflows are the business-process layer above agents.
 */
import { daily_content_sprint } from './daily_content_sprint'
import { ship_a_feature } from './ship_a_feature'
import { find_customers } from './find_customers'
import { defend_position } from './defend_position'
import type { Workflow } from './types'

export const WORKFLOWS: Workflow[] = [
  daily_content_sprint,
  ship_a_feature,
  find_customers,
  defend_position,
]

export function findWorkflow(id: string): Workflow | undefined {
  return WORKFLOWS.find((w) => w.id === id)
}

export function listWorkflows(): Array<Pick<Workflow, 'id' | 'name' | 'description' | 'embodies' | 'estimatedMinutes' | 'outcome' | 'triggers'>> {
  return WORKFLOWS.map(({ id, name, description, embodies, estimatedMinutes, outcome, triggers }) => ({
    id, name, description, embodies, estimatedMinutes, outcome, triggers,
  }))
}
