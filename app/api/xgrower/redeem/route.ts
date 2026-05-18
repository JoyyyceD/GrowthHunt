import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PRO_GRANT_DAYS = 30

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

  let body: { code?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400, headers: cors() })
  }

  const code = String(body.code ?? '').trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'invite code is required' }, { status: 400, headers: cors() })
  }

  // Check if user already has an active pro grant
  const { data: existingGrant } = await admin
    .from('xgrower_pro_grants')
    .select('expires_at')
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingGrant) {
    return NextResponse.json(
      { error: 'You already have an active Pro subscription.' },
      { status: 409, headers: cors() },
    )
  }

  // Atomically claim one use of the invite code
  const { data: claimed, error: claimErr } = await admin.rpc('xgrower_claim_invite_code', { p_code: code })
  if (claimErr || !claimed) {
    return NextResponse.json(
      { error: 'Invalid or expired invite code.' },
      { status: 400, headers: cors() },
    )
  }

  // Create or renew pro grant (30 days from now)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + PRO_GRANT_DAYS)

  const { error: grantErr } = await admin
    .from('xgrower_pro_grants')
    .upsert(
      { user_id: user.id, invite_code: code, granted_at: new Date().toISOString(), expires_at: expiresAt.toISOString() },
      { onConflict: 'user_id' },
    )

  if (grantErr) {
    console.error('[xgrower/redeem] grant error:', grantErr)
    return NextResponse.json({ error: 'Failed to activate Pro, please try again.' }, { status: 500, headers: cors() })
  }

  return NextResponse.json({
    ok: true,
    message: `Pro activated for ${PRO_GRANT_DAYS} days!`,
    expiresAt: expiresAt.toISOString(),
  }, { headers: cors() })
}
