/**
 * Default 14-day archetype mapping (heuristic, pre-cluster).
 *
 * This is the placeholder mapping used until Task #4 (cluster archetypes from
 * data) lands. The shape is: day_number → archetype tag string. The archetypes
 * here mirror xhunter_tweets.tags values so we can pull exemplars by tag match.
 *
 * Sourced from a generic "successful AI startup launch arc": big-bang launch,
 * traction proof, narrative depth, social proof, then ramp to second wave.
 */
export type Archetype =
  | 'launch'
  | 'metric'
  | 'thread'
  | 'low-key-demo'
  | 'engagement'
  | 'meme'
  | 'behind-the-scenes'
  | 'early-stage'

export interface DayPlan {
  day: number
  archetype: Archetype
  title: string
  hint: string
}

export const DEFAULT_PLAN: DayPlan[] = [
  { day:  1, archetype: 'launch',            title: 'The launch tweet',            hint: 'Introducing X. The hero post — pin this.' },
  { day:  2, archetype: 'behind-the-scenes', title: 'Why we built it',             hint: 'The founding story — what broke before this existed.' },
  { day:  3, archetype: 'low-key-demo',      title: 'A 30-second product demo',    hint: 'Screen recording, no narration. Let it speak.' },
  { day:  4, archetype: 'thread',            title: 'A meaty thread',              hint: 'How we built X / what we learned doing Y. 5–7 tweets.' },
  { day:  5, archetype: 'engagement',        title: 'Ask the audience',            hint: 'Open-ended question that pulls your ideal user out of lurk mode.' },
  { day:  6, archetype: 'meme',              title: 'A meme or one-liner',         hint: 'Show a personality. Bonus points if it riffs on category in-jokes.' },
  { day:  7, archetype: 'metric',            title: 'First-week numbers',          hint: 'Sign-ups, MRR, downloads — whatever moved. Specifics over hype.' },
  { day:  8, archetype: 'low-key-demo',      title: 'Highlight one feature',       hint: 'A tight clip of the most surprising thing your product does.' },
  { day:  9, archetype: 'behind-the-scenes', title: 'Stack / team / process',      hint: 'Tools, decisions, who built what. Eng/founder transparency.' },
  { day: 10, archetype: 'engagement',        title: 'A poll or prompt',            hint: 'Lower the bar to participate. Keep it adjacent to your product.' },
  { day: 11, archetype: 'thread',            title: 'A second thread',             hint: 'Pick a narrower wedge — a single technical or design decision.' },
  { day: 12, archetype: 'launch',            title: 'A v1.1 / new feature',        hint: 'Re-launch energy. Even small ships deserve their own moment.' },
  { day: 13, archetype: 'metric',            title: 'A milestone or testimonial',  hint: 'A user quote, a chart, a screenshot of someone praising it.' },
  { day: 14, archetype: 'meme',              title: 'A reflection or thank-you',   hint: 'Two-week retro / gratitude post. Sets up week 3+ as cadence.' },
]
