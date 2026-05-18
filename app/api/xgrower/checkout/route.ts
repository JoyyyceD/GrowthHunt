import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUserPro } from '@/lib/xgrower/pro'

const LS_API_BASE = 'https://api.lemonsqueezy.com/v1'
const REDIRECT_URL = 'https://www.growthhunt.ai/xgrower/redeem?success=1'

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

  // Already Pro? Don't let them double-pay.
  if (await isUserPro(user.id)) {
    return NextResponse.json(
      { error: 'You already have Pro.' },
      { status: 409, headers: cors() },
    )
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  const storeId = process.env.LEMONSQUEEZY_STORE_ID
  const variantId = process.env.LEMONSQUEEZY_XGROWER_VARIANT_ID

  if (!apiKey || !storeId || !variantId) {
    console.error('[xgrower/checkout] missing LS env vars', {
      hasApiKey: !!apiKey,
      hasStoreId: !!storeId,
      hasVariantId: !!variantId,
    })
    return NextResponse.json(
      { error: 'Xgrower Pro pricing not yet configured. Please check back tomorrow.' },
      { status: 500, headers: cors() },
    )
  }

  const lsBody = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: user.email ?? undefined,
          custom: {
            user_id: user.id,
            product: 'xgrower',
          },
        },
        checkout_options: {
          embed: false,
          media: false,
        },
        product_options: {
          redirect_url: REDIRECT_URL,
        },
      },
      relationships: {
        store: {
          data: { type: 'stores', id: String(storeId) },
        },
        variant: {
          data: { type: 'variants', id: String(variantId) },
        },
      },
    },
  }

  let lsRes: Response
  try {
    lsRes = await fetch(`${LS_API_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(lsBody),
    })
  } catch (err) {
    console.error('[xgrower/checkout] LS fetch failed:', err)
    return NextResponse.json(
      { error: 'Checkout service unavailable. Please try again.' },
      { status: 502, headers: cors() },
    )
  }

  if (!lsRes.ok) {
    const errText = await lsRes.text().catch(() => '')
    console.error('[xgrower/checkout] LS error', lsRes.status, errText)
    return NextResponse.json(
      { error: 'Failed to create checkout. Please try again.' },
      { status: 502, headers: cors() },
    )
  }

  const lsJson = await lsRes.json() as {
    data?: { attributes?: { url?: string } }
  }
  const checkoutUrl = lsJson?.data?.attributes?.url
  if (!checkoutUrl) {
    console.error('[xgrower/checkout] missing checkout url in LS response', lsJson)
    return NextResponse.json(
      { error: 'Failed to create checkout. Please try again.' },
      { status: 502, headers: cors() },
    )
  }

  return NextResponse.json({ checkoutUrl }, { headers: cors() })
}
