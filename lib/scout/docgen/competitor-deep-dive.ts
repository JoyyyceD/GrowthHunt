/** competitor-deep-dive.md — onboarding-spec §1.6: depth on the strongest rival. */
import type { DocSpec } from './index'

export const competitorDeepDive: DocSpec = {
  slug: 'competitor-deep-dive',
  title: intel => `Competitive deep dive: ${intel.product.name} vs ${intel.competitors[0]?.name || 'the field'}`,
  maxTokens: 2400,
  prompt: intel => `Write "competitor-deep-dive.md" for ${intel.product.name}, focused on the single strongest competitor from the intelligence (${intel.competitors[0]?.name || 'pick from the list'}).

Structure (exactly these sections):
# Competitive landscape

## Primary competitor: {name}

### What they do well
2-3 paragraphs of honest credit — their distribution, brand trust, product strengths. No strawmanning; the user needs the real picture.

### Gaps in their approach
3 numbered friction points, each with a bolded label and 2-3 sentences of evidence from the intelligence (their format, pricing model, audience they underserve). Only claim gaps the intelligence supports.

### Differentiation strategy
3-4 bolded plays. Frame each as "serve a different moment/person", never "be a better {competitor}". End with one italicized positioning line that captures the difference in under 20 words.

If the intelligence has no competitors, write a short note explaining the category appears uncontested in the research, what that usually means (search was thin OR genuinely new category), and which 3 searches to run to verify.`,
}
