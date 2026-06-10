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
- Hook types, one each, in whatever order fits: Pain, Story, Data, Contrarian, Tease, Win, Question.
- Body is the COMPLETE post text, publishable as-is, in the brand voice. X posts ≤ 280 chars; LinkedIn 600-1200 chars; Reddit written as community member (include target subreddit in the Channel cell), zero marketing tone; Facebook conversational medium length.
- The Data hook may only use numbers from the intelligence dataPoints (with source named in the post). If no dataPoint fits, replace Data with a second Story hook and note why.
- Channel mix follows the audience: use the channels from the intelligence segments.
- CTA is short and concrete ("Start recording", "See how it works") — never "Don't miss out".

After the table:
## Modeled on
${caseNotes ? `One short paragraph connecting this calendar's rhythm to these real cases:\n${caseNotes}` : 'One sentence: this rhythm front-loads trust-building before conversion asks; precedent cases will be linked once the case engine is enabled.'}`,
  }
}
