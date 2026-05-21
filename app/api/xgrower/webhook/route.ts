import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// LemonSqueezy webhook endpoint for Xgrower subscriptions.
//
// Events handled:
//   subscription_created           → INSERT row, set profiles.tier = 'paid'
//   subscription_updated           → UPDATE row (status / period_end / variant)
//   subscription_payment_success   → extend current_period_end
//   subscription_payment_failed    → no-op (LS already retries 3x before sending _expired)
//   subscription_cancelled         → mark cancelled_at but keep access until period_end
//   subscription_expired           → revoke (profiles.tier='free' only if no other active access)
//
// Signature: HMAC-SHA256(raw body, LEMONSQUEEZY_WEBHOOK_SECRET) === X-Signature header

type LsPayload = {
  meta?: {
    event_name?: string
    custom_data?: {
      user_id?: string
      product?: string
    }
  }
  data?: {
    id?: string
    attributes?: {
      status?: string
      variant_id?: number | string
      renews_at?: string | null
      ends_at?: string | null
      cancelled?: boolean
      // for payment_success events, the renewal date lives on attributes.renews_at as well
    }
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[xgrower/webhook] missing LEMONSQUEEZY_WEBHOOK_SECRET — no-op')
    // Return 200 so LS doesn't spam-retry while env var is being added
    return NextResponse.json({ ok: false, reason: 'not_configured' }, { status: 200 })
  }

  const rawBody = await req.text()
  const sigHeader = req.headers.get('x-signature') ?? ''
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  if (!sigHeader || !timingSafeEqualHex(expected, sigHeader)) {
    console.warn('[xgrower/webhook] invalid signature')
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let payload: LsPayload
  try {
    payload = JSON.parse(rawBody) as LsPayload
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const eventName = payload.meta?.event_name
  const userId = payload.meta?.custom_data?.user_id
  const product = payload.meta?.custom_data?.product
  const lsSubId = payload.data?.id ? String(payload.data.id) : null
  const attrs = payload.data?.attributes ?? {}

  if (!eventName || !lsSubId) {
    console.warn('[xgrower/webhook] missing event_name or subscription id', { eventName, lsSubId })
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 })
  }

  // Only handle xgrower subscriptions. Other products may share the same webhook in future.
  if (product && product !== 'xgrower') {
    return NextResponse.json({ ok: true, ignored: 'wrong_product' }, { status: 200 })
  }

  if (!userId) {
    console.error('[xgrower/webhook] missing user_id in custom_data', { eventName, lsSubId })
    return NextResponse.json({ ok: true, ignored: 'no_user_id' }, { status: 200 })
  }

  const admin = createAdminClient()
  const status = String(attrs.status ?? '')
  const variantId = attrs.variant_id != null ? String(attrs.variant_id) : ''
  const periodEnd = attrs.renews_at ?? attrs.ends_at ?? null

  try {
    switch (eventName) {
      case 'subscription_created': {
        if (!periodEnd) {
          console.warn('[xgrower/webhook] subscription_created without period end', { lsSubId })
        }
        const { error } = await admin.from('xgrower_subscriptions').upsert(
          {
            user_id: userId,
            ls_subscription_id: lsSubId,
            ls_variant_id: variantId,
            status: status || 'active',
            current_period_end: periodEnd ?? new Date(Date.now() + 31 * 86_400_000).toISOString(),
            cancelled_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        if (error) throw error

        const { error: profErr } = await admin
          .from('profiles')
          .update({ tier: 'paid' })
          .eq('id', userId)
        if (profErr) throw profErr
        break
      }

      case 'subscription_updated': {
        const update: Record<string, unknown> = {
          status: status || 'active',
          ls_variant_id: variantId || undefined,
          updated_at: new Date().toISOString(),
        }
        if (periodEnd) update.current_period_end = periodEnd
        // If LS marked it cancelled (subscription_updated can carry the flag), preserve cancelled_at
        if (attrs.cancelled === true) {
          update.cancelled_at = update.cancelled_at ?? new Date().toISOString()
        }
        // Remove undefined keys
        for (const k of Object.keys(update)) {
          if (update[k] === undefined) delete update[k]
        }
        const { error } = await admin
          .from('xgrower_subscriptions')
          .update(update)
          .eq('user_id', userId)
        if (error) throw error
        break
      }

      case 'subscription_payment_success': {
        // Extend period to the new renews_at; also ensure active + paid tier.
        const update: Record<string, unknown> = {
          status: 'active',
          updated_at: new Date().toISOString(),
        }
        if (periodEnd) update.current_period_end = periodEnd

        const { error } = await admin
          .from('xgrower_subscriptions')
          .update(update)
          .eq('user_id', userId)
        if (error) throw error

        // Re-grant paid tier in case it was previously revoked.
        await admin.from('profiles').update({ tier: 'paid' }).eq('id', userId)
        break
      }

      case 'subscription_payment_failed': {
        // Don't revoke immediately — LS retries 3x and will fire subscription_expired on final failure.
        console.log('[xgrower/webhook] payment_failed (no-op, awaiting retry)', { userId, lsSubId })
        break
      }

      case 'subscription_cancelled': {
        // Keep access until current_period_end.
        const update: Record<string, unknown> = {
          status: status || 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        if (periodEnd) update.current_period_end = periodEnd
        const { error } = await admin
          .from('xgrower_subscriptions')
          .update(update)
          .eq('user_id', userId)
        if (error) throw error
        break
      }

      case 'subscription_expired': {
        // Mark sub expired
        const { error } = await admin
          .from('xgrower_subscriptions')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
        if (error) throw error

        // Revoke profiles.tier to 'free' only if user has no other active access
        // (active invite-code grant). We don't touch tier if a grant covers them.
        const { data: grant } = await admin
          .from('xgrower_pro_grants')
          .select('expires_at')
          .eq('user_id', userId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle()

        if (!grant) {
          await admin.from('profiles').update({ tier: 'free' }).eq('id', userId)
        }
        break
      }

      default: {
        // Unhandled event — log and ack so LS stops retrying.
        console.log('[xgrower/webhook] unhandled event', eventName)
      }
    }
  } catch (err) {
    console.error('[xgrower/webhook] handler error', { eventName, lsSubId, err })
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
