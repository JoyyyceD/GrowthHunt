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
  const platforms: SocialPlatform[] = ['x', 'linkedin', 'reddit']
  const status = Object.fromEntries(platforms.map((p) => [p, Boolean(getPlatformCreds(p))]))
  return NextResponse.json({ enabled: status })
}
