/**
 * Tweet template detection + skeletonization.
 *
 * skeletonize(text):
 *   Normalize a tweet into a comparable "skeleton" by replacing variable
 *   tokens (numbers, URLs, @handles, $ amounts, emoji runs) with stable
 *   placeholders. Used as a grouping key in post-roi.ts.
 *
 * detectInTweetRepetition(text):
 *   Detect whether a single tweet is built from a repeating intra-tweet
 *   template — e.g. numbered/bulleted lists, repeated emoji-prefixed lines.
 *   Returns isTemplate=true plus the skeleton of the repeating unit so the
 *   caller can group tweets sharing the same internal pattern.
 *
 * NOTE: This file was missing from the upstream commit that introduced
 * post-roi.ts (commit 36b3f6b). Reconstructed from the call sites.
 */

const URL_RE = /\bhttps?:\/\/\S+/g
const HANDLE_RE = /(?<![A-Za-z0-9_])@[A-Za-z0-9_]{1,15}/g
const HASHTAG_RE = /(?<![A-Za-z0-9_])#[\p{L}\p{N}_]+/gu
const MONEY_RE = /[$€£¥₹]\s?\d[\d,]*(?:\.\d+)?[KkMmBb]?/g
const PERCENT_RE = /\d+(?:\.\d+)?%/g
const NUMBER_RE = /(?<![\d.])\d[\d,]*(?:\.\d+)?\b/g
const EMOJI_RE = /\p{Extended_Pictographic}/gu
const WHITESPACE_RE = /\s+/g

export function skeletonize(text: string): string {
  if (!text) return ''
  let s = text.normalize('NFKC')
  s = s.replace(URL_RE, '{URL}')
  s = s.replace(HANDLE_RE, '{USER}')
  s = s.replace(HASHTAG_RE, '{TAG}')
  s = s.replace(MONEY_RE, '{MONEY}')
  s = s.replace(PERCENT_RE, '{PCT}')
  s = s.replace(NUMBER_RE, '{N}')
  s = s.replace(EMOJI_RE, '{E}')
  s = s.replace(/\{E\}(\s*\{E\})+/g, '{E}')
  s = s.replace(WHITESPACE_RE, ' ').trim()
  return s.slice(0, 200)
}

export interface RepetitionResult {
  isTemplate: boolean
  templateSkeleton?: string
}

const LIST_PREFIX_RE = /^\s*(?:[-*•·●◆▪▫]|\(?\d{1,2}[.)]|[①-⑳]|[\p{Extended_Pictographic}]+)\s+/u

export function detectInTweetRepetition(text: string): RepetitionResult {
  if (!text) return { isTemplate: false }

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (rawLines.length < 2) return { isTemplate: false }

  // Strategy: a tweet is a template if 2+ lines share the same leading
  // structure — either the same list/bullet/emoji prefix shape, or the same
  // first 1-2 skeletonized tokens. Threshold is 2 (not 3) because founder
  // tweets are short — most list-style posts only have 2-3 items, and a
  // 3-line threshold misses too many real templates.
  const prefixes: string[] = []
  const skeletons: string[] = []
  for (const line of rawLines) {
    const m = line.match(LIST_PREFIX_RE)
    const prefix = m ? m[0].replace(/\d+/, 'N').replace(/\s+/g, '') : ''
    prefixes.push(prefix)
    skeletons.push(skeletonize(line))
  }

  // Same non-empty prefix on 3+ lines → list template.
  const prefixCounts = new Map<string, number>()
  for (const p of prefixes) {
    if (!p) continue
    prefixCounts.set(p, (prefixCounts.get(p) || 0) + 1)
  }
  for (const [prefix, count] of prefixCounts) {
    if (count >= 2) {
      const sampleIdx = prefixes.findIndex((p) => p === prefix)
      const unit = skeletons[sampleIdx] || ''
      return {
        isTemplate: true,
        templateSkeleton: `{LIST:${prefix}} × ${count} :: ${unit.slice(0, 80)}`,
      }
    }
  }

  // Same leading 1-2 skeleton tokens on 3+ lines → enumeration template.
  const headCounts = new Map<string, number>()
  for (const sk of skeletons) {
    const head = sk.split(' ').slice(0, 2).join(' ')
    if (!head) continue
    headCounts.set(head, (headCounts.get(head) || 0) + 1)
  }
  for (const [head, count] of headCounts) {
    if (count >= 2) {
      return {
        isTemplate: true,
        templateSkeleton: `{HEAD:${head}} × ${count}`,
      }
    }
  }

  return { isTemplate: false }
}
