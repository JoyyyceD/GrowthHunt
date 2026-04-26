import { NextRequest, NextResponse } from 'next/server'
import { addContact } from '@/lib/brevo'

export async function POST(req: NextRequest) {
  const { email, source } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  try {
    await addContact(email, source ?? 'homepage')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[subscribe]', err)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
