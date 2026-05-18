import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUserPro } from '@/lib/xgrower/pro'

const FREE_DAILY_QUOTA = 10
const FREE_MONTHLY_QUOTA = 100
const MINIMAX_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2'

// System prompt is managed server-side — not exposed to or editable by users
const SYSTEM_PROMPT = `## Role
You are an engaged X/Twitter user in the tech industry, focused on building your audience.

## Style Guidelines
- Be concise and clear
- Create informal responses
- Use all lowercase letters
- Adhere to X's character limit
- Make replies intelligent and thought-provoking

## Content Restrictions
- Do not use hashtags
- Do not use apostrophes
- Do not use emojis
- Do not use em dashes

## Tone
- Be conversational yet professional
- Demonstrate expertise in technology topics
- Maintain a friendly, approachable voice
- Stay engaging without becoming too casual

## Response Structure
- Keep sentences short and impactful
- Be concise and direct
- Use only simple punctuation
- Break down complex ideas into easy-to-understand points
- End with a compelling hook when suitable

## IMPORTANT
Only provide the final response. Do not include any thinking, checklists, validation steps, or meta-commentary. Generate the reply directly.`

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: cors() })
  }

  const admin = createAdminClient()
  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: cors() })
  }

  let body: { tweetContent?: string; templatePrompt?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400, headers: cors() })
  }

  const pro = await isUserPro(user.id)

  if (!pro) {
    const now = new Date()
    const dayStr = now.toISOString().slice(0, 10)
    const monthStr = now.toISOString().slice(0, 7) + '-01'

    const [{ data: dailyRow }, { data: monthlyRow }] = await Promise.all([
      admin.from('xgrower_daily_usage').select('used').eq('user_id', user.id).eq('day', dayStr).single(),
      admin.from('xgrower_usage').select('used').eq('user_id', user.id).eq('month', monthStr).single(),
    ])

    const dailyUsed = dailyRow?.used ?? 0
    const monthlyUsed = monthlyRow?.used ?? 0

    if (dailyUsed >= FREE_DAILY_QUOTA) {
      return NextResponse.json(
        { error: `Daily limit of ${FREE_DAILY_QUOTA} replies reached. Come back tomorrow!` },
        { status: 429, headers: cors() },
      )
    }
    if (monthlyUsed >= FREE_MONTHLY_QUOTA) {
      return NextResponse.json(
        { error: `Monthly quota of ${FREE_MONTHLY_QUOTA} replies reached. Use an invite code to unlock Pro.` },
        { status: 429, headers: cors() },
      )
    }
  }

  // Call MiniMax
  const minimaxKey = process.env.MINIMAX_API_KEY
  if (!minimaxKey) {
    console.error('[xgrower/generate] MINIMAX_API_KEY not set')
    return NextResponse.json({ error: 'service misconfigured' }, { status: 500, headers: cors() })
  }

  const systemPrompt = [SYSTEM_PROMPT, body.templatePrompt].filter(Boolean).join('\n\n')
  const userPrompt = body.tweetContent
    ? `Generate a reply to this post: "${body.tweetContent}"`
    : 'Create an engaging post'

  let reply: string
  try {
    const mmRes = await fetch(MINIMAX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${minimaxKey}` },
      body: JSON.stringify({
        model: process.env.XGROWER_MODEL ?? 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 80,
        temperature: 0,
      }),
    })

    if (!mmRes.ok) {
      const txt = await mmRes.text().catch(() => '')
      throw new Error(`MiniMax ${mmRes.status}: ${txt.slice(0, 200)}`)
    }

    const mmData = await mmRes.json()
    if (mmData?.base_resp?.status_code && mmData.base_resp.status_code !== 0) {
      throw new Error(`MiniMax error ${mmData.base_resp.status_code}: ${mmData.base_resp.status_msg}`)
    }

    reply = mmData?.choices?.[0]?.message?.content?.trim()
    if (!reply) throw new Error('Empty response from MiniMax')
  } catch (err) {
    console.error('[xgrower/generate] MiniMax error:', err)
    return NextResponse.json({ error: 'AI generation failed, please retry' }, { status: 502, headers: cors() })
  }

  // Only track usage for free users
  if (!pro) {
    const now = new Date()
    const dayStr = now.toISOString().slice(0, 10)
    const monthStr = now.toISOString().slice(0, 7) + '-01'
    await Promise.all([
      admin.rpc('xgrower_increment_daily_usage', { p_user_id: user.id, p_day: dayStr }),
      admin.rpc('xgrower_increment_usage', { p_user_id: user.id, p_month: monthStr }),
    ])
  }

  return NextResponse.json({ reply }, { headers: cors() })
}
