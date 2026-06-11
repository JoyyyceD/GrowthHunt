/** audience-persona.md — onboarding-spec §1.3. */
import type { DocSpec } from './index'

export const audiencePersona: DocSpec = {
  slug: 'audience-persona',
  title: intel => `Personas: ${intel.product.name}`,
  maxTokens: 2400,
  prompt: intel => `Write "audience-persona.md" for ${intel.product.name} based on the audience segments in the intelligence.

Structure (exactly these sections):
# Personas & go-to-market approach

## Primary persona: {first name}
Give them a full name, age, role, and city — plausible and specific, clearly an illustration not a real customer. Then:
- A one-line table-free header block: Name / Age / Role / Tech comfort
- **Goals** — 4 bullets, in their own voice and stakes (not feature wishes)
- **Pains** — 5 bullets, each a concrete blocked moment (what they tried, why it stalled)
- **Motivations** — 3 bullets, the deeper "why now"
- **Channels** — where they actually spend time (platform + frequency + behavior, e.g. "lurks r/AgingParents, never posts")
- **Buying signals** — 3 bullets: the searches, posts, or moments that mean they're ready to pay

## Secondary persona: {first name}
Shorter: one intro paragraph (who, age, situation), one quoted JTBD line in their voice ("I want to..."), and 2-3 bullets on how their needs differ from the primary persona.

Method (from customer-research practice):
- Directly under the # title (which still comes first), add one italic line: "*Personas are illustrative composites built from the brand research — names and details are representative, not real customers.*"
- JTBD phrased as a job statement: "When [situation], I want [motivation], so I can [outcome]."
- Pains must be voice-of-customer style — the words a real user would type in a Reddit thread or G2 review, drawn from the intelligence pains/channels, not marketing-speak.
- Buying signals are observable triggers (a search they run, a thread they post, an event that forces the decision) — not attitudes.
- Channels must come from the intelligence segments; for each, say how they behave there (lurk, post, ask), not just the platform name.
Ground every detail in the intelligence segments — no generic persona filler.`,
}
