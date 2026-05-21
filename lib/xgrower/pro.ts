import { createAdminClient } from '@/lib/supabase/admin'

export async function isUserPro(userId: string): Promise<boolean> {
  const admin = createAdminClient()

  // 1. Paid tier on profiles (manual grant by admin OR set by subscription webhook)
  const { data: profile } = await admin
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single()

  if (profile?.tier === 'paid') return true

  // 2. Active invite-code pro grant
  const { data: grant } = await admin
    .from('xgrower_pro_grants')
    .select('expires_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (grant) return true

  // 3. Active LemonSqueezy subscription
  //    Considered active if status='active' OR cancelled-but-period-not-yet-ended.
  const nowIso = new Date().toISOString()
  const { data: sub } = await admin
    .from('xgrower_subscriptions')
    .select('status, cancelled_at, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  if (sub && sub.current_period_end && sub.current_period_end > nowIso) {
    if (sub.status === 'active') return true
    if (sub.cancelled_at) return true
  }

  return false
}
