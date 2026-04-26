import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'

// Vercel/Cloudflare set x-forwarded-for as a comma-separated list,
// the first entry is the original client.
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  const xri = req.headers.get('x-real-ip')
  if (xri) return xri.trim()
  return '0.0.0.0'
}

// Salt rotates every UTC day automatically — no cron needed.
function todaysSalt(): string {
  const base = process.env.DAILY_SALT_BASE
  if (!base || base.length < 32) {
    throw new Error('DAILY_SALT_BASE missing or too short (need ≥32 chars)')
  }
  const date = new Date().toISOString().slice(0, 10) // 2026-04-26
  return createHash('sha256').update(`${base}|${date}`).digest('hex')
}

export function ipHash(ip: string): string {
  return createHash('sha256').update(`${ip}|${todaysSalt()}`).digest('hex')
}
