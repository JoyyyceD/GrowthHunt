/** POST /api/scout/waitlist { email } — beta waitlist signup (no auth required). */
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid body' }, { status: 400 })
  }
  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return Response.json({ error: 'valid email required' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('email_subscriptions')
    .select('id')
    .eq('email', email)
    .eq('source', 'scout-waitlist')
    .maybeSingle()
  if (!existing) {
    const { error } = await admin
      .from('email_subscriptions')
      .insert({ email, source: 'scout-waitlist', metadata: { joined_from: '/scout' } })
    if (error) return Response.json({ error: 'could not save' }, { status: 500 })
  }
  return Response.json({ ok: true })
}
