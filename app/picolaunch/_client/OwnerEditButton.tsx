'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/browser'

interface Props {
  slug: string
  ownerId: string | null
}

// Page itself is ISR (cached HTML, same for everyone), so owner detection
// can't happen on the server. Done in the browser instead — render nothing
// until we know who the user is to avoid a flash.
export default function OwnerEditButton({ slug, ownerId }: Props) {
  const [isOwner, setIsOwner] = useState<boolean | null>(null)

  useEffect(() => {
    if (!ownerId) { setIsOwner(false); return }
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsOwner(!!user && user.id === ownerId)
    })
  }, [ownerId])

  if (!isOwner) return null

  return (
    <Link
      href={`/picolaunch/${slug}/edit`}
      className="comment-btn"
      style={{ textDecoration: 'none' }}
      title="Edit this launch"
    >
      Edit
    </Link>
  )
}
