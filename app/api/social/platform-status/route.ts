/**
 * GET /api/social/platform-status — tell the UI which native platforms have
 * their OAuth app credentials set on the server. Lets us show a clear
 * "not yet enabled" state on the Connect button instead of letting a click
 * bounce back as an error.
 */
import { NextResponse } from 'next/server'
import { getPlatformCreds, type SocialPlatform } from '@/lib/social/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  // X uses BYO (each user pastes their own X API keys → they pay X, not us)
  // → always "enabled" on the UI; the connect path is a modal, not OAuth.
  // LinkedIn / Reddit share a single GrowthHunt OAuth app gated by env creds.
  const linkedin = Boolean(getPlatformCreds('linkedin' as SocialPlatform))
  const reddit = Boolean(getPlatformCreds('reddit' as SocialPlatform))
  return NextResponse.json({
    enabled: { x: true, linkedin, reddit },
    mode: { x: 'byo', linkedin: 'shared', reddit: 'shared' },
  })
}
