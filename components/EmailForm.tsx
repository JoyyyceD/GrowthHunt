'use client'

import { useState } from 'react'

interface EmailFormProps {
  source: string
  placeholder?: string
  buttonText?: string
  variant?: 'dark' | 'light'
}

export default function EmailForm({
  source,
  placeholder = 'your@email.com',
  buttonText = 'Get Early Access',
  variant = 'dark',
}: EmailFormProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      if (!res.ok) throw new Error()
      setState('success')
    } catch {
      setState('error')
    }
  }

  const inputClass = variant === 'light'
    ? 'flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors'
    : 'flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors'

  const buttonClass = variant === 'light'
    ? 'bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap'
    : 'bg-white text-black text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-colors whitespace-nowrap'

  const successClass = variant === 'light' ? 'text-sm text-gray-500' : 'text-sm text-neutral-400'

  if (state === 'success') {
    return <p className={successClass}>You&apos;re on the list — we&apos;ll notify you when access opens.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      <button type="submit" disabled={state === 'loading'} className={buttonClass}>
        {state === 'loading' ? '...' : buttonText}
      </button>
      {state === 'error' && (
        <p className="text-xs text-red-500 mt-1 w-full">Something went wrong. Try again.</p>
      )}
    </form>
  )
}
