/** first-week-calendar.md — onboarding-spec §1.5. caseNotes hook = T14. */
import type { BrandIntelligence } from '../intel'
import type { DocSpec } from './index'

export function firstWeekCalendar(caseNotes?: string): DocSpec {
  return {
    slug: 'first-week-calendar',
    title: intel => `First week of posts: ${intel.product.name}`,
    maxTokens: 3200,
    prompt: (intel: BrandIntelligence) => `Write "first-week-calendar.md" for ${intel.product.name}: 7 ready-to-publish posts, one per day.

Structure:
# 7-day content calendar

A markdown table with columns: Day | Channel | Hook type | Body | CTA

Hard requirements:
- Hook types, one each, in whatever order fits — and the first line of every post must BE the hook:
  Pain ("Tired of X?" — name the exact moment it hurts), Story ("3 years ago [past]. Today [present]."),
  Data (a sourced number that reframes the problem), Contrarian ("[Common advice] is wrong. Here's why:"),
  Tease (a specific curiosity gap, no clickbait), Win (a concrete outcome with specifics FROM THE INTELLIGENCE ONLY — no invented dollar amounts or customer counts),
  Question (a rhetorical question the audience argues about in comments).
- Body is the COMPLETE post text, publishable as-is, in the brand voice. X posts ≤ 280 chars; LinkedIn 600-1200 chars; Reddit written as community member (include target subreddit in the Channel cell), zero marketing tone; Facebook conversational medium length.
- The Data hook may only use numbers from the intelligence dataPoints (with source named in the post). If no dataPoint fits, replace Data with a second Story hook and note why.
- Channel mix follows the audience: use the channels from the intelligence segments.
- CTA formula: [action verb] + [what they get] ("Start recording", "Get the checklist", "See it in action"). Banned CTAs: "Learn more", "Sign up", "Don't miss out", "Click here".
- No external links in post bodies (reach suppression) — Reddit/X CTAs read as natural next steps, not ad copy.

After the table:
## Modeled on
${caseNotes ? `One short paragraph connecting this calendar's rhythm to these real cases:\n${caseNotes}` : 'One sentence: this rhythm front-loads trust-building before conversion asks; precedent cases will be linked once the case engine is enabled.'}`,
  }
}
