/**
 * Shared types for the Postiz integration.
 *
 * Postiz is the scheduling/sending engine; GrowthHunt mirrors just enough to
 * render the scheduler UI and feed Post ROI without round-tripping Postiz.
 */

/** A connected channel on the Postiz side ("integration" in their API). */
export interface PostizIntegration {
  integration_id: string
  platform: string          // 'x' | 'linkedin' | 'reddit' | 'mastodon' | ...
  name: string | null
  picture: string | null
  disabled: boolean
}

/** Per-workspace Postiz credentials. */
export interface PostizConnection {
  workspace_id: string
  api_url: string
  api_key: string
  label: string | null
  last_synced_at: string | null
}

export type ScheduledPostStatus = 'draft' | 'scheduled' | 'posted' | 'failed' | 'canceled'
export type ScheduledPostType = 'schedule' | 'now' | 'draft'

/** Local mirror row of a post handed to Postiz. */
export interface ScheduledPost {
  id: string
  workspace_id: string
  postiz_post_id: string | null
  integration_id: string
  platform: string
  content: string
  media: Array<{ id: string; path: string; url?: string; kind?: string; mime?: string; bytes?: number }>
  type: ScheduledPostType
  scheduled_for: string | null
  status: ScheduledPostStatus
  posted_at: string | null
  external_post_id: string | null
  error: string | null
  source: string
  conversation_id: string | null
  task_id: string | null
  created_at: string
  updated_at: string
}

/** Input to schedule one post across one or more channels. */
export interface SchedulePostInput {
  content: string
  /** Postiz integration ids to publish to. */
  integrationIds: string[]
  /** ISO timestamp; omit/null for immediate ('now'). */
  when?: string | null
  type?: ScheduledPostType
  media?: Array<{ id: string; path: string }>
  shortLink?: boolean
}
