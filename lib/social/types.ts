/**
 * Native multi-platform posting — self-built provider adapters.
 *
 * Clean-room implementations against each platform's OFFICIAL API docs (we do
 * not copy Postiz source). Postiz stays available as an optional API-boundary
 * bridge for long-tail platforms; these adapters own X / LinkedIn / Reddit.
 *
 * Each adapter implements the OAuth connect handshake + publishing. The
 * orchestrator and the scheduler cron talk only to this interface, so adding
 * a platform = adding one adapter + registering it.
 */

import type { MediaItem } from './media'

export type SocialPlatform = 'x' | 'linkedin' | 'reddit'

/** A stored, usable connection (token row hydrated from social_connections). */
export interface SocialConnection {
  id: string
  workspace_id: string
  platform: SocialPlatform
  account_id: string | null
  account_handle: string | null
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  scopes: string | null
  meta: Record<string, unknown>
}

/** Result of exchanging an OAuth code → tokens + account identity. */
export interface OAuthTokenResult {
  access_token: string
  refresh_token?: string | null
  expires_in?: number | null          // seconds
  scope?: string | null
  account_id?: string | null
  account_handle?: string | null
  meta?: Record<string, unknown>
}

export interface PublishResult {
  externalId: string                   // platform's post id
  url?: string                         // permalink if derivable
}

/** Per-publish, platform-specific overrides — adapters interpret what they need. */
export interface PublishOptions {
  // Reddit
  subreddit?: string                   // 'AskMarketing' (no r/ prefix)
  title?: string                       // explicit title for link/self
  link?: string                        // URL → kind=link self-post
  flairId?: string
  // LinkedIn
  asOrganizationUrn?: string           // urn:li:organization:<id> → post as Page
}

/** Per-platform OAuth app credentials, read from env. */
export interface PlatformAppCreds {
  clientId: string
  clientSecret: string
}

export interface SocialAdapter {
  platform: SocialPlatform
  /** Human label for UI. */
  label: string
  /** OAuth scopes this adapter needs. */
  scopes: string[]
  /** True when the platform issues refresh tokens (so we can auto-renew). */
  refreshable: boolean

  /** Build the authorize URL to redirect the user to. */
  authUrl(args: { creds: PlatformAppCreds; redirectUri: string; state: string; codeChallenge?: string }): string

  /** Exchange the callback `code` for tokens + account identity. */
  exchangeCode(args: { creds: PlatformAppCreds; redirectUri: string; code: string; codeVerifier?: string }): Promise<OAuthTokenResult>

  /** Refresh an expired access token (only if `refreshable`). */
  refresh?(args: { creds: PlatformAppCreds; refreshToken: string }): Promise<OAuthTokenResult>

  /** Publish a post using a live connection. Throws on failure. */
  publish(args: { conn: SocialConnection; content: string; media?: MediaItem[]; options?: PublishOptions }): Promise<PublishResult>

  /** Whether this platform's connect flow uses PKCE (code_verifier). */
  usesPkce?: boolean
}

/** Env var names per platform for the OAuth app creds. */
export const PLATFORM_ENV: Record<SocialPlatform, { id: string; secret: string }> = {
  x:        { id: 'X_OAUTH_CLIENT_ID',        secret: 'X_OAUTH_CLIENT_SECRET' },
  linkedin: { id: 'LINKEDIN_CLIENT_ID',       secret: 'LINKEDIN_CLIENT_SECRET' },
  reddit:   { id: 'REDDIT_CLIENT_ID',         secret: 'REDDIT_CLIENT_SECRET' },
}

export function getPlatformCreds(platform: SocialPlatform): PlatformAppCreds | null {
  const keys = PLATFORM_ENV[platform]
  const clientId = process.env[keys.id]
  const clientSecret = process.env[keys.secret]
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}
