/**
 * Playbook registry — the orchestrator picks playbooks by id from here.
 */
import { onboarding } from './onboarding'
import { weekly_review } from './weekly_review'
import { launch_post } from './launch_post'
import { find_first_100 } from './find_first_100'
import { pre_launch_geo_pass } from './pre_launch_geo_pass'
import type { Playbook } from './types'

export const PLAYBOOKS: Playbook[] = [
  onboarding,
  weekly_review,
  launch_post,
  find_first_100,
  pre_launch_geo_pass,
]

export function findPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id)
}

export function listPlaybooks(): Pick<Playbook, 'id' | 'name' | 'description' | 'estimatedMinutes'>[] {
  return PLAYBOOKS.map(({ id, name, description, estimatedMinutes }) => ({ id, name, description, estimatedMinutes }))
}
