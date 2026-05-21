/** First Answer — does the page open by directly answering its topic?
 *  The one LLM-scored dimension (MiniMax, via lib/audit/llm.ts). */
import type { AuditContext, Check, Dimension } from '../types'
import { mkCheck, buildDimension } from './_helpers'
import { scoreFirstAnswer } from '../llm'

const META = { id: 'first-answer', label: 'First Answer', weight: 15, version: '1.0.0' }

export const firstAnswer: Dimension = {
  ...META,
  async run(ctx: AuditContext) {
    const result = await scoreFirstAnswer(ctx)
    const checks: Check[] = [
      mkCheck('direct-answer', 'First ~80 words directly answer the topic', 65, result.directAnswer.status, {
        detail: result.directAnswer.reason,
        fix: result.directAnswer.status !== 'pass'
          ? 'Rewrite the opening 1–2 sentences to state plainly what the page is and the problem it solves'
          : undefined,
      }),
      mkCheck('title-is-query', 'Title maps to a real question / query', 35, result.titleIsQuery.status, {
        detail: result.titleIsQuery.reason,
        fix: result.titleIsQuery.status !== 'pass'
          ? 'Frame the title around a question users actually ask an AI assistant'
          : undefined,
      }),
    ]
    return buildDimension(META, checks)
  },
}
