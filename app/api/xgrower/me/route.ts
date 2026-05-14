import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const FREE_DAILY_QUOTA = 10
const FREE_MONTHLY_QUOTA = 100

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() })
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: cors() })
  }

  const admin = createAdminClient()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: cors() })
  }

  const { data: profile } = await admin.from('profiles').select('tier').eq('id', user.id).single()
  const tier = profile?.tier ?? 'free'

  const now = new Date()
  const dayStr = now.toISOString().slice(0, 10)
  const monthStr = now.toISOString().slice(0, 7) + '-01'

  const [{ data: dailyRow }, { data: monthlyRow }] = await Promise.all([
    admin.from('xgrower_daily_usage').select('used').eq('user_id', user.id).eq('day', dayStr).single(),
    admin.from('xgrower_usage').select('used').eq('user_id', user.id).eq('month', monthStr).single(),
  ])

  const dailyUsed = dailyRow?.used ?? 0
  const monthlyUsed = monthlyRow?.used ?? 0

  return NextResponse.json({
    email: user.email,
    tier,
    dailyQuota: FREE_DAILY_QUOTA,
    dailyUsed,
    dailyRemaining: Math.max(0, FREE_DAILY_QUOTA - dailyUsed),
    monthlyQuota: FREE_MONTHLY_QUOTA,
    monthlyUsed,
    monthlyRemaining: Math.max(0, FREE_MONTHLY_QUOTA - monthlyUsed),
  }, { headers: cors() })
}
