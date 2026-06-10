/** market-research.md — onboarding-spec §1.7: wide view, sourced data only. */
import type { DocSpec } from './index'

export const marketResearch: DocSpec = {
  slug: 'market-research',
  title: intel => `Market opportunity: ${intel.product.name}`,
  maxTokens: 2400,
  prompt: intel => `Write "market-research.md" for ${intel.product.name} (category: ${intel.product.category}).

Structure (exactly these sections):
# Market opportunity

## Market size & tailwinds
Up to 3 short paragraphs, each anchored on one dataPoint from the intelligence (claim + named source). THIS IS THE CRITICAL RULE: if the intelligence has fewer than 3 usable dataPoints, write fewer paragraphs and add one italicized line: "*Additional market data pending verification — we don't ship numbers we can't source.*" Never pad with invented statistics.

## Competitive set
Markdown table covering ALL competitors from the intelligence: Product | Format | Pricing | Key difference vs ${intel.product.name} | Who it fits. Wide and shallow — the deep dive on the leader lives in competitor-deep-dive.md.

## Audience insights
3-4 behavioral observations about this audience drawn from the intelligence segments (where they gather, seasonal moments, who makes the buying decision). Mark each as observation or sourced fact — don't dress reasoning up as data.

## What to verify next
3 bullets: the highest-value numbers worth confirming (market size, seasonal search spikes, community sizes) and where to look.`,
}
