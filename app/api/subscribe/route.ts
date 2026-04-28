import { NextRequest, NextResponse } from 'next/server'
import { addContact } from '@/lib/brevo'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { email, source } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const cleanEmail = String(email).trim().toLowerCase()
  const cleanSource = (source ?? 'homepage').toString().slice(0, 80)

  // 1) Persist to Supabase. Idempotent on (email, source) — re-submits update created_at.
  let supabaseOk = false
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('email_subscriptions')
      .upsert(
        { email: cleanEmail, source: cleanSource },
        { onConflict: 'email,source' }
      )
    if (error) throw error
    supabaseOk = true
  } catch (err) {
    console.error('[subscribe] supabase error', err)
  }

  // 2) Push to Brevo so existing email automations still fire.
  let brevoOk = false
  try {
    await addContact(cleanEmail, cleanSource)
    brevoOk = true
  } catch (err) {
    console.error('[subscribe] brevo error', err)
  }

  // Succeed if either sink captured it. Fail only when both fail (true loss).
  if (!supabaseOk && !brevoOk) {
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
