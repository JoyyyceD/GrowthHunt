/**
 * Founder Voice Trainer.
 *
 * Pulls the founder's recent original tweets from xhunter_tweets (if their
 * handle is already in the dataset), distills a voice profile, and returns
 * it for the workspace to consume.
 *
 * Heuristic features (computed from text) feed the model so the output
 * stays grounded — model isn't asked to guess sentence length or emoji
 * frequency.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { callAgent, extractJson } from './llm'
import type { VoiceProfile } from '@/lib/workspace/types'

const SAMPLE_SIZE = 40
const MIN_TWEET_LEN = 24

interface VoiceFeatures {
  tweetCount: number
  avgWords: number
  emojiRate: number       // 0..1, fraction of tweets with at least one emoji
  exclaimRate: number
  questionRate: number
  hashTagRate: number
  topVocab: string[]      // 12 most distinctive content words
  samples: string[]       // up to 6 high-signal tweets for cadence
}

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','if','of','to','for','in','on','at','with','by','as',
  'is','it','this','that','these','those','i','you','we','they','he','she','our','your','my',
  'be','been','was','were','will','would','should','can','could','do','does','did','have','has','had',
  'so','just','only','very','really','more','most','some','any','no','not','than','then','also','too',
  'about','from','into','out','up','down','over','under','again','its','am','re','ve','ll','don','t',
  'rt','https','co','com','www','http','what','when','where','who','why','how','here','there',
])

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/@\w+/g, ' ')
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

const EMOJI_RE = /\p{Extended_Pictographic}/u

function computeFeatures(tweets: string[]): VoiceFeatures {
  const wordTotals: number[] = []
  let emoji = 0, excl = 0, q = 0, hashTag = 0
  const wordFreq = new Map<string, number>()
  for (const t of tweets) {
    const w = t.split(/\s+/).filter(Boolean)
    wordTotals.push(w.length)
    if (EMOJI_RE.test(t)) emoji++
    if (/!/.test(t)) excl++
    if (/\?/.test(t)) q++
    if (/#\w+/.test(t)) hashTag++
    for (const tok of tokens(t)) {
      if (STOP_WORDS.has(tok) || tok.length < 4) continue
      wordFreq.set(tok, (wordFreq.get(tok) || 0) + 1)
    }
  }
  const sorted = [...wordFreq.entries()].sort((a, b) => b[1] - a[1])
  const topVocab = sorted.slice(0, 12).map(([w]) => w)
  const avgWords = wordTotals.length
    ? Math.round(wordTotals.reduce((s, n) => s + n, 0) / wordTotals.length)
    : 0
  const samples = [...tweets].sort((a, b) => b.length - a.length).slice(0, 6)
  return {
    tweetCount: tweets.length,
    avgWords,
    emojiRate: tweets.length ? emoji / tweets.length : 0,
    exclaimRate: tweets.length ? excl / tweets.length : 0,
    questionRate: tweets.length ? q / tweets.length : 0,
    hashTagRate: tweets.length ? hashTag / tweets.length : 0,
    topVocab,
    samples,
  }
}

function emojiBand(rate: number): 'none' | 'rare' | 'frequent' {
  if (rate < 0.05) return 'none'
  if (rate < 0.3) return 'rare'
  return 'frequent'
}

export interface VoiceTrainInput {
  handle: string            // X handle, no '@'
  /** Optional extra long-form samples (blog posts, etc.) to enrich the profile. */
  extraSamples?: string[]
}

export interface VoiceTrainOutput {
  voice: VoiceProfile
  sourceCount: number
  notes: string
}

export async function trainVoice(input: VoiceTrainInput): Promise<VoiceTrainOutput> {
  const handle = input.handle.replace(/^@/, '').toLowerCase()
  let tweets: string[] = []
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('xhunter_tweets')
      .select('text')
      .ilike('handle', handle)
      .eq('is_rt', false)
      .order('created_at_x', { ascending: false })
      .limit(SAMPLE_SIZE * 2)
    tweets = (data || [])
      .map((r) => String(r.text || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t.length >= MIN_TWEET_LEN)
      .slice(0, SAMPLE_SIZE)
  } catch (err) {
    console.error('[voice] xhunter pull failed:', (err as Error).message)
  }

  const all = [...tweets, ...(input.extraSamples || []).map((s) => s.trim()).filter(Boolean)]
  if (all.length < 5) {
    return {
      voice: {
        summary: `Not enough samples for @${handle}. We pulled ${tweets.length} tweets from xhunter_tweets and ${input.extraSamples?.length ?? 0} extras. Add the handle to xhunter (or paste blog excerpts) to train.`,
        trained_at: new Date().toISOString(),
        sample_passages: all,
      },
      sourceCount: all.length,
      notes: 'Insufficient sample size — voice profile not generated.',
    }
  }

  const features = computeFeatures(all)

  const system =
    'You are a writing-style analyst. Given a founder\'s recent posts and '
    + 'computed style features, write a tight voice profile another AI agent '
    + 'can mimic. Be concrete and brief. Reply with ONLY a JSON object.'

  const user = [
    `Handle: @${handle}`,
    `Sample count: ${all.length}`,
    `Avg words per post: ${features.avgWords}`,
    `Emoji rate: ${(features.emojiRate * 100).toFixed(0)}%`,
    `Exclamation rate: ${(features.exclaimRate * 100).toFixed(0)}%`,
    `Question rate: ${(features.questionRate * 100).toFixed(0)}%`,
    `Hashtag rate: ${(features.hashTagRate * 100).toFixed(0)}%`,
    `Recurring vocabulary: ${features.topVocab.join(', ')}`,
    '',
    'Top samples (longest, for cadence):',
    ...features.samples.map((s, i) => `${i + 1}) ${s.slice(0, 240)}`),
    '',
    'Return JSON exactly:',
    '{',
    '  "summary": "<3-4 sentences. How this person sounds. Specific.>",',
    '  "tone": "<one phrase, e.g. \'dry & analytical\', \'punchy & sales-y\'>",',
    '  "formatting": "<one phrase, e.g. \'short paragraphs, dashes for lists\'>",',
    '  "vocabulary": ["<6-10 signature words/phrases this person actually uses>"]',
    '}',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 600, temperature: 0.3 })
  const parsed = extractJson<{ summary?: string; tone?: string; formatting?: string; vocabulary?: string[] }>(raw)

  const voice: VoiceProfile = {
    summary: parsed?.summary || `Concise founder voice with ~${features.avgWords}-word posts, ${features.emojiRate < 0.1 ? 'no' : 'sparing'} emoji.`,
    tone: parsed?.tone || undefined,
    formatting: parsed?.formatting || undefined,
    vocabulary: parsed?.vocabulary && Array.isArray(parsed.vocabulary) && parsed.vocabulary.length
      ? parsed.vocabulary.filter((v) => typeof v === 'string').slice(0, 10)
      : features.topVocab.slice(0, 8),
    sentence_avg: features.avgWords,
    emoji: emojiBand(features.emojiRate),
    sample_passages: features.samples.slice(0, 4),
    trained_at: new Date().toISOString(),
  }

  return {
    voice,
    sourceCount: all.length,
    notes: parsed
      ? `Voice profile trained on ${all.length} samples (avg ${features.avgWords} words, ${(features.emojiRate * 100).toFixed(0)}% emoji).`
      : `LLM unavailable — falling back to heuristic profile from ${all.length} samples.`,
  }
}
