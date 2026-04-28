import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { addContact } from '@/lib/brevo'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { product_url, product_name, description, goal, contact_email } = body

  // Validate required fields
  if (!product_url || !/^https?:\/\/.+/.test(product_url)) {
    return NextResponse.json({ error: '请输入有效的产品 URL' }, { status: 400 })
  }
  if (!product_name || product_name.trim().length < 1) {
    return NextResponse.json({ error: '请输入产品名称' }, { status: 400 })
  }
  if (!contact_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
    return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 })
  }
  if (!['dr', 'awareness'].includes(goal)) {
    return NextResponse.json({ error: '请选择提交目标' }, { status: 400 })
  }

  // Get current user if logged in (optional)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Insert order via admin client (bypasses RLS for service-level write)
  const admin = createAdminClient()
  const { error: dbError } = await admin
    .from('listingbott_orders')
    .insert({
      product_url: product_url.trim(),
      product_name: product_name.trim(),
      description: description?.trim() ?? null,
      goal,
      contact_email: contact_email.trim().toLowerCase(),
      user_id: user?.id ?? null,
      status: 'pending',
    })

  if (dbError) {
    console.error('[listingbott] db error', dbError)
    return NextResponse.json({ error: '提交失败，请稍后重试' }, { status: 500 })
  }

  // Add to Brevo list so you get notified + user gets follow-up
  try {
    await addContact(contact_email.trim().toLowerCase(), 'listingbott-order')
  } catch (err) {
    // Non-fatal — order is already saved
    console.error('[listingbott] brevo error', err)
  }

  return NextResponse.json({ ok: true })
}
