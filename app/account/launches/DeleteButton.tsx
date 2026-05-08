'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  slug: string
  name: string
}

export default function DeleteButton({ slug, name }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const onClick = async () => {
    if (pending) return
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return
    setPending(true)
    try {
      const res = await fetch(`/api/champions/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(`Delete failed: ${j.error ?? res.status}`)
        setPending(false)
        return
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="comment-btn"
      style={{
        color: pending ? 'var(--ink-faint)' : '#a8323b',
        cursor: pending ? 'wait' : 'pointer',
      }}
      title="Delete launch"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
