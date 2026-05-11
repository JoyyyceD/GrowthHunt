'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  to: number
  durationMs?: number
  prefix?: string
  suffix?: string
  /** Format with locale-aware thousands separators (default true). */
  format?: boolean
}

/**
 * Counter that rolls 0 → `to` on mount.
 * Uses requestAnimationFrame with ease-out cubic so the number "settles"
 * into place — feels like an odometer / scoreboard, not a linear ramp.
 */
export function AnimatedCounter({
  to,
  durationMs = 1500,
  prefix = '',
  suffix = '',
  format = true,
}: AnimatedCounterProps) {
  const [value, setValue] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) {
      setValue(to)
      return
    }

    function tick(now: number) {
      if (startTimeRef.current === null) startTimeRef.current = now
      const elapsed = now - startTimeRef.current
      const t = Math.min(1, elapsed / durationMs)
      // ease-out cubic — fast start, gentle settle
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * to))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [to, durationMs, reducedMotion])

  const display = format ? value.toLocaleString('en-US') : String(value)

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
