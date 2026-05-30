/**
 * Adapter registry — maps a platform key to its SocialAdapter.
 * Add a platform: implement an adapter and register it here.
 */
import type { SocialAdapter, SocialPlatform } from './types'
import { xAdapter } from './adapters/x'
import { linkedinAdapter } from './adapters/linkedin'
import { redditAdapter } from './adapters/reddit'

const ADAPTERS: Record<SocialPlatform, SocialAdapter> = {
  x: xAdapter,
  linkedin: linkedinAdapter,
  reddit: redditAdapter,
}

export function getAdapter(platform: string): SocialAdapter | null {
  return (ADAPTERS as Record<string, SocialAdapter>)[platform] ?? null
}

export function allAdapters(): SocialAdapter[] {
  return Object.values(ADAPTERS)
}

export function isSocialPlatform(p: string): p is SocialPlatform {
  return p === 'x' || p === 'linkedin' || p === 'reddit'
}
