/** business-profile.md — onboarding-spec §1.1. */
import type { DocSpec } from './index'

export const businessProfile: DocSpec = {
  slug: 'business-profile',
  title: intel => `${intel.product.name}: ${intel.product.category}`,
  maxTokens: 2200,
  prompt: intel => `Write "business-profile.md" for ${intel.product.name} (${intel.product.url}) — 600 to 900 words.

Structure (exactly these sections):
# ${intel.product.name}: The {differentiator} {category}
(pick the sharpest differentiator from the intelligence for the title)

## What they do
Two paragraphs: what the product does, then what friction it removes. Concrete user actions, not feature lists.

## Core market
Primary audience with age range, role, and motivation — ground it with one named, plausible example persona (one sentence). Then one short paragraph on the secondary segment.

## Why now
3-4 bolded drivers (demographic, technology, cultural, category-proof), each 1-2 sentences. Use ONLY dataPoints and whyNow evidence from the intelligence; if evidence is thin, argue from the product's own logic instead of inventing numbers.

## Monetization
Pricing model and actual prices from the intelligence. If pricing is unknown, say "pricing not public" and describe the likely model in one sentence.

## Growth signals
Verifiable signals only (user counts, ratings, countries, funding) — from the intelligence. If none exist, write what signal to look for instead.

## Competitive moat
1-2 paragraphs: why this is hard to copy. Reference the named competitors' gaps.`,
}
