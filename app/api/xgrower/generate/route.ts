import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const FREE_DAILY_QUOTA = 10
const FREE_MONTHLY_QUOTA = 100
const PAID_DAILY_QUOTA = 9999   // effectively unlimited per day
const PAID_MONTHLY_QUOTA = 9999
const MINIMAX_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2'

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

  let body: {
    tweetContent?: string
    systemPrompt?: string
    templatePrompt?: string
    model?: string
    advancedSettings?: { temperature?: number; maxTokens?: number }
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400, headers: cors() })
  }

  // Determine tier & quotas
  const { data: profile } = await admin.from('profiles').select('tier').eq('id', user.id).single()
  const tier = profile?.tier ?? 'free'
  const dailyQuota = tier === 'paid' ? PAID_DAILY_QUOTA : FREE_DAILY_QUOTA
  const monthlyQuota = tier === 'paid' ? PAID_MONTHLY_QUOTA : FREE_MONTHLY_QUOTA

  const now = new Date()
  const dayStr = now.toISOString().slice(0, 10)           // e.g. 2026-05-14
  const monthStr = now.toISOString().slice(0, 7) + '-01'  // e.g. 2026-05-01

  // Check daily and monthly usage in parallel
  const [{ data: dailyRow }, { data: monthlyRow }] = await Promise.all([
    admin.from('xgrower_daily_usage').select('used').eq('user_id', user.id).eq('day', dayStr).single(),
    admin.from('xgrower_usage').select('used').eq('user_id', user.id).eq('month', monthStr).single(),
  ])

  const dailyUsed = dailyRow?.used ?? 0
  const monthlyUsed = monthlyRow?.used ?? 0

  if (dailyUsed >= dailyQuota) {
    return NextResponse.json(
      { error: `Daily limit of ${dailyQuota} replies reached. Come back tomorrow!` },
      { status: 429, headers: cors() },
    )
  }
  if (monthlyUsed >= monthlyQuota) {
    return NextResponse.json(
      { error: `Monthly quota of ${monthlyQuota} replies reached.${tier === 'free' ? ' Upgrade to Pro for more.' : ''}` },
      { status: 429, headers: cors() },
    )
  }

  // Call MiniMax
  const minimaxKey = process.env.MINIMAX_API_KEY
  if (!minimaxKey) {
    console.error('[xgrower/generate] MINIMAX_API_KEY not set')
    return NextResponse.json({ error: 'service misconfigured' }, { status: 500, headers: cors() })
  }

  const systemPrompt = [body.systemPrompt, body.templatePrompt].filter(Boolean).join('\n\n')
  const userPrompt = body.tweetContent
    ? `Generate a reply to this post: "${body.tweetContent}"`
    : 'Create an engaging post'

  let reply: string
  try {
    const mmRes = await fetch(MINIMAX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${minimaxKey}` },
      body: JSON.stringify({
        model: body.model ?? 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: body.advancedSettings?.maxTokens ?? 80,
        temperature: body.advancedSettings?.temperature ?? 0,
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

  // Atomically increment both daily and monthly counters
  await Promise.all([
    admin.rpc('xgrower_increment_daily_usage', { p_user_id: user.id, p_day: dayStr }),
    admin.rpc('xgrower_increment_usage', { p_user_id: user.id, p_month: monthStr }),
  ])

  return NextResponse.json({ reply }, { headers: cors() })
}
