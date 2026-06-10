/**
 * social-strategy.md — onboarding-spec §1.4.
 * `caseNotes` (T14 case engine) injects real Growth Story precedents; until
 * then the Playbook precedent section is gracefully omitted.
 */
import type { BrandIntelligence } from '../intel'
import type { DocSpec } from './index'

export function socialStrategy(caseNotes?: string): DocSpec {
  return {
    slug: 'social-strategy',
    title: intel => `Social playbook: ${intel.product.name}`,
    maxTokens: 2600,
    prompt: (intel: BrandIntelligence) => `Write "social-strategy.md" for ${intel.product.name}.

Structure (exactly these sections):
# Social media playbook

## Channel priorities
Rank 4 channels with one-line reasons tied to where THIS audience actually is (from the persona channels in the intelligence). Consider Reddit seriously — if this audience lives in specific subreddits, name them and rank Reddit accordingly; if Reddit genuinely doesn't fit, leave it out rather than forcing it.

## Channel strategy
Markdown table: Channel | Primary audience | Content format | Cadence | Voice tone. Cadences must be sustainable for a small team (no "post 5x daily").

## Content pillar rotation
For each chosen channel, one short paragraph: which content types rotate on which days, and what each pillar is FOR (trust, reach, conversion).

## Engagement rules
Four rules with specifics: response time window; first-touch philosophy (curiosity before pitch, with an example reply); story-first principle; how to harvest testimonials from comments (ask permission, then feature).
${caseNotes ? `
## Playbook precedent
Reference these real growth cases and what applies to ${intel.product.name} specifically:\n${caseNotes}` : ''}`,
  }
}
