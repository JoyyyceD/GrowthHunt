'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export interface CreateSessionResult {
  ok: boolean
  error?: string
}

export async function createViralxSession(formData: FormData): Promise<CreateSessionResult> {
  const handleRaw = String(formData.get('handle') || '').trim()
  const blurb = String(formData.get('blurb') || '').trim()

  // Normalize handle: strip @, lowercase. Reject obviously invalid.
  const handle = handleRaw.replace(/^@+/, '').toLowerCase()
  if (!handle || !/^[a-z0-9_]{1,15}$/.test(handle)) {
    return { ok: false, error: 'Enter your X handle (letters, numbers, underscore — up to 15 chars).' }
  }
  if (!blurb || blurb.length < 10) {
    return { ok: false, error: 'Tell us in one line what your startup does (≥10 chars).' }
  }
  if (blurb.length > 280) {
    return { ok: false, error: 'Keep the blurb under 280 chars.' }
  }

  const sb = await createServerClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'You need to sign in with Google to start a ViralX plan.' }
  }

  const { data: row, error: insErr } = await sb
    .from('viralx_sessions')
    .insert({ user_id: user.id, handle, startup_blurb: blurb })
    .select('id')
    .single()

  if (insErr || !row) {
    return { ok: false, error: insErr?.message || 'Could not create session.' }
  }

  redirect(`/viralx/sessions/${row.id}`)
}
