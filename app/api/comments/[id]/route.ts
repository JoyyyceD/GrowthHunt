import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// DELETE /api/comments/[id] — author only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)
    .eq('author_id', user.id)
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
