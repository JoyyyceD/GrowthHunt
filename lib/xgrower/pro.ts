import { createAdminClient } from '@/lib/supabase/admin'

export async function isUserPro(userId: string): Promise<boolean> {
  const admin = createAdminClient()

  // Paid tier on profiles (manual grant by admin)
  const { data: profile } = await admin
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single()

  if (profile?.tier === 'paid') return true

  // Active invite-code pro grant
  const { data: grant } = await admin
    .from('xgrower_pro_grants')
    .select('expires_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .single()

  return !!grant
}
