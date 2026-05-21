/** Captured email leads (geo_subscribers). Degrades silently on failure. */
import { createAdminClient } from '@/lib/supabase/admin'

export type SubscriberSource = 'web_form' | 'unlock' | 'pro_waitlist'

export async function saveSubscriber(email: string, source: SubscriberSource): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin
      .from('geo_subscribers')
      .upsert(
        { email: email.trim().toLowerCase(), source },
        { onConflict: 'email,source', ignoreDuplicates: true },
      )
  } catch (err) {
    console.error('[geo] subscriber save failed:', (err as Error).message)
  }
}
