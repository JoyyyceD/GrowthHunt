/** The 7 onboarding docs in generation order (decision 2.1). */
import { businessProfile } from './business-profile'
import { brandGuidelines } from './brand-guidelines'
import { audiencePersona } from './audience-persona'
import { socialStrategy } from './social-strategy'
import { firstWeekCalendar } from './first-week-calendar'
import { competitorDeepDive } from './competitor-deep-dive'
import { marketResearch } from './market-research'
import type { DocSpec } from './index'

export function onboardingDocs(caseNotes?: string): DocSpec[] {
  return [
    businessProfile,
    brandGuidelines,
    audiencePersona,
    socialStrategy(caseNotes),
    firstWeekCalendar(caseNotes),
    competitorDeepDive,
    marketResearch,
  ]
}
