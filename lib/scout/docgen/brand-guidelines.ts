/** brand-guidelines.md — onboarding-spec §1.2. */
import type { DocSpec } from './index'

export const brandGuidelines: DocSpec = {
  slug: 'brand-guidelines',
  title: intel => `Brand voice: ${intel.product.name}`,
  maxTokens: 2200,
  prompt: intel => `Write "brand-guidelines.md" for ${intel.product.name}.

Structure (exactly these sections):
# Brand voice: ${intel.product.name}

## Voice sliders
A markdown table: Dimension | Score | What it means. Five dimensions: Formality, Playfulness, Authority, Detail, Emotional resonance. Score X/10 derived from the voiceObservations and toneWords in the intelligence. "What it means" is one concrete sentence about how it shows up in writing.

## Color palette
A markdown table: Color | Hex | Role | Usage. Use ONLY hexes from the intelligence palette. If the palette is empty, write one line: "Palette not captured — extract from the site before designing assets." and skip the table.

## Sample messaging
6-8 quoted example lines that sound like this brand (informed by sloganCandidates and tone). Each usable as-is in an ad or post. No hashtags.

## Tone guardrails
One paragraph: the emotional line this brand walks — what it always does, what it never does. Specific to THIS audience's fears and hopes, not generic advice.

## Forbidden phrases
At least 6 bullets of words/patterns this brand must never use. Mix two kinds: universal AI-marketing tells ("revolutionary", fake urgency) AND category-specific cliches for ${intel.product.category} that would make this brand sound like everyone else. For each, a 3-6 word reason.`,
}
