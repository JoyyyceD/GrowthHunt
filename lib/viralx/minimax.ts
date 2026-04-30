/**
 * MiniMax chat completion — server-only.
 *
 * MiniMax has historically used a few different base URLs (`api.minimax.chat`,
 * `api.minimaxi.com`, `api.minimax.io`). We default to api.minimax.chat which
 * is the canonical China endpoint, and allow override via env var if a project
 * is on a different region/account.
 */

const DEFAULT_BASE = 'https://api.minimax.chat/v1'
const DEFAULT_MODEL = 'MiniMax-Text-01'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface MinimaxChatOpts {
  messages: ChatMessage[]
  model?: string
  maxTokens?: number
  temperature?: number
}

export async function minimaxChat(opts: MinimaxChatOpts): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) throw new Error('MINIMAX_API_KEY not set')
  const baseUrl = process.env.MINIMAX_BASE_URL || DEFAULT_BASE

  const res = await fetch(`${baseUrl}/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.85,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`MiniMax HTTP ${res.status}: ${errText.slice(0, 400)}`)
  }
  const data = await res.json().catch(() => null) as
    | { choices?: Array<{ message?: { content?: string } }>; base_resp?: { status_code?: number; status_msg?: string } }
    | null
  if (data?.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax error ${data.base_resp.status_code}: ${data.base_resp.status_msg ?? ''}`)
  }
  const text = data?.choices?.[0]?.message?.content
  if (!text || typeof text !== 'string') {
    throw new Error('MiniMax returned no content')
  }
  return text.trim()
}
