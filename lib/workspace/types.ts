/**
 * GTM Workspace — the shared "brain" every agent reads.
 *
 * Mirrors the gtm_workspaces table. Owner-scoped via RLS.
 */

export interface IcpSegment {
  name: string
  size_hint?: string
  channels?: string[]
  jtbd?: string
  pains?: string[]
}

export interface CompetitorRef {
  name: string
  url?: string
  note?: string
}

export interface VoiceProfile {
  tone?: string
  vocabulary?: string[]
  sentence_avg?: number
  emoji?: 'none' | 'rare' | 'frequent'
  formatting?: string
  sample_passages?: string[]
  summary?: string
  /** ISO when the voice profile was last refreshed */
  trained_at?: string
}

export interface Workspace {
  id: string
  owner_id: string | null
  name: string
  url: string
  one_liner?: string | null
  icp_summary?: string | null
  icp_segments: IcpSegment[]
  positioning?: string | null
  key_messages: string[]
  competitors: CompetitorRef[]
  voice?: VoiceProfile | null
  voice_handle?: string | null
  brand_color?: string | null
  emoji?: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceCreate {
  name: string
  url: string
  one_liner?: string
  brand_color?: string
  emoji?: string
}

export interface WorkspacePatch extends Partial<WorkspaceCreate> {
  icp_summary?: string | null
  icp_segments?: IcpSegment[]
  positioning?: string | null
  key_messages?: string[]
  competitors?: CompetitorRef[]
  voice?: VoiceProfile | null
  voice_handle?: string | null
}
