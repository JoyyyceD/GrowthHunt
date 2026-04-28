import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { addContact, sendTransactionalEmail } from '@/lib/brevo'

export const dynamic = 'force-dynamic'

const NOTIFY_EMAIL = process.env.LISTINGBOTT_NOTIFY_EMAIL ?? 'djyjoyce@qq.com'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

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

  // Add to Brevo list (non-fatal)
  try {
    await addContact(contact_email.trim().toLowerCase(), 'listingbott-order')
  } catch (err) {
    console.error('[listingbott] brevo contact error', err)
  }

  // Send notification email to admin (non-fatal)
  try {
    const safeName = escapeHtml(product_name.trim())
    const safeUrl = escapeHtml(product_url.trim())
    const safeEmail = escapeHtml(contact_email.trim().toLowerCase())
    const safeDesc = description?.trim() ? escapeHtml(description.trim()) : '<em style="color:#999">(none)</em>'
    const goalLabel = goal === 'dr' ? 'Boost Domain Rating' : 'Brand Awareness'

    await sendTransactionalEmail({
      to: NOTIFY_EMAIL,
      subject: `🆕 New ListingBott order: ${product_name.trim()}`,
      htmlContent: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#14110d;">New ListingBott order</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#14110d;">
            <tr><td style="padding:8px 0;color:#999;width:120px;">Product</td><td style="padding:8px 0;font-weight:600;">${safeName}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">URL</td><td style="padding:8px 0;"><a href="${safeUrl}" style="color:#e84e1b;">${safeUrl}</a></td></tr>
            <tr><td style="padding:8px 0;color:#999;">Goal</td><td style="padding:8px 0;">${goalLabel}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Contact</td><td style="padding:8px 0;"><a href="mailto:${safeEmail}" style="color:#e84e1b;">${safeEmail}</a></td></tr>
            <tr><td style="padding:8px 0;color:#999;vertical-align:top;">Description</td><td style="padding:8px 0;line-height:1.5;">${safeDesc}</td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#999;">View all orders in Supabase Studio → listingbott_orders table.</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[listingbott] notify email error', err)
  }

  return NextResponse.json({ ok: true })
}
