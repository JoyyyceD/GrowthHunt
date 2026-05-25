/**
 * Video Coach — NOT a generation engine. A director.
 *
 * Given a scenario + duration + workspace context, output:
 *   - A 30-60s shot list with per-second VO + shot type + b-roll + on-screen text
 *   - Pre-shoot checklist (gear/light/audio/network)
 *   - Recommended external tools (Arcade for demo, Submagic for captions, etc.)
 *   - Pre-upload 5-item self-check (cover, title, first-3-sec hook, captions, CTA)
 *
 * Stays cheap by being prompt-only — no model generates video here.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { callAgent, extractJson, workspaceContext, withVoice } from '@/lib/agents/llm'
import type { Workspace } from '@/lib/workspace/types'

export type VideoScenario = 'demo' | 'founder_hook' | 'tutorial' | 'story'

export const SCENARIO_LABEL: Record<VideoScenario, string> = {
  demo: 'Product demo (screencast)',
  founder_hook: 'Founder talking-head hook (≤60s)',
  tutorial: 'How-to tutorial',
  story: 'Story-driven narrative',
}

const SCENARIO_PROMPT_HINTS: Record<VideoScenario, string> = {
  demo: 'Screencast of the product. Mix screen + small face cam if scenario allows. Highlight ONE wow moment in first 3s. Pace each shot ≤5s to keep scroll-stopping.',
  founder_hook: 'Single face-camera shot, founder speaks direct to lens. Hook must be a strong claim or counter-intuitive observation in first 3s. No B-roll cuts longer than 4s.',
  tutorial: 'Step-by-step format. Number each step on screen. Start with the outcome (the "after"), then walk back. Keep VO tight; no padding.',
  story: '3-act structure (problem → struggle → resolution). Founder VO or text-only with stock b-roll. End on a thesis sentence.',
}

const TOOL_RECOMMENDATIONS: Record<VideoScenario, Array<{ name: string; what: string; price: string }>> = {
  demo: [
    { name: 'Arcade.software', what: 'Interactive demo recording with built-in cursor highlights', price: 'Free tier' },
    { name: 'Loom',            what: 'Quick screen + cam record + share link', price: '$8/mo' },
    { name: 'Submagic',        what: 'AI captions + viral templates for shorts', price: '$10/mo' },
    { name: 'CapCut',          what: 'Full edit + transitions + B-roll', price: 'Free' },
  ],
  founder_hook: [
    { name: 'iPhone 14+',      what: 'Cinematic 1080p60 in good light', price: 'Already own' },
    { name: 'Lavalier mic',    what: 'Clean audio matters more than 4K — Rode Lavalier Go ~$80', price: '$80' },
    { name: 'OpusClip',        what: 'Long-form → short-form auto-cut + caption', price: '$15/mo' },
    { name: 'CapCut',          what: 'Final polish + captions', price: 'Free' },
  ],
  tutorial: [
    { name: 'Arcade.software', what: 'Step-numbered interactive demo', price: 'Free tier' },
    { name: 'OBS Studio',      what: 'Free screen + cam multi-source record', price: 'Free' },
    { name: 'Descript',        what: 'Text-based video editing — delete filler words by deleting text', price: '$15/mo' },
    { name: 'Submagic',        what: 'Auto-captions in 50+ languages', price: '$10/mo' },
  ],
  story: [
    { name: 'Pictory',         what: 'Text → stock b-roll auto-edit', price: '$23/mo' },
    { name: 'Canva',           what: 'Animated text overlays', price: 'Free tier' },
    { name: 'ElevenLabs',      what: 'AI voice clone for VO if founder shy', price: '$5/mo' },
    { name: 'CapCut',          what: 'Final assembly', price: 'Free' },
  ],
}

const PRE_SHOOT_CHECKLIST = [
  'Light: window OR ring light at 45° in front; never overhead',
  'Audio: clip-on lavalier or dead-quiet room with USB mic; check levels first',
  'Background: clean wall or shallow depth-of-field; avoid clutter',
  'Camera: 1080p60 minimum; landscape for YouTube + square for IG + portrait for TikTok',
  'Network: if recording over screencast, hardwire ethernet; cap apps',
  'Outfit: solid color, no logos, no chevron patterns (moire on camera)',
  'Water + script printed; do 1 take cold, 1 take with notes',
]

const PRE_UPLOAD_CHECKLIST = [
  'Cover thumbnail: high-contrast, ≤6 word text, face if possible',
  'Title: lead with outcome or curiosity gap, ≤60 chars for IG/TikTok',
  'First 3s hook: a tweet-length claim ON SCREEN, not just spoken',
  'Captions: burned-in for IG/TikTok, separate .srt for YouTube',
  'CTA: ONE link + ONE ask. Multiple = none. Pin first comment.',
]

interface RawScript {
  title?: string
  shot_list?: Array<{ t_start?: number; t_end?: number; vo?: string; shot?: string; b_roll?: string; on_screen_text?: string }>
  notes?: string
}

export interface VideoScript {
  id?: string
  workspace_id: string
  scenario: VideoScenario
  duration_sec: number
  title: string
  shot_list: Array<{ t_start: number; t_end: number; vo: string; shot: string; b_roll: string; on_screen_text: string }>
  checklist: string[]
  external_tools: Array<{ name: string; what: string; price: string }>
  pre_upload: string[]
  notes?: string
  created_at?: string
}

export interface VideoCoachInput {
  workspace: Workspace
  scenario: VideoScenario
  durationSec: number
  topic: string  // what the video is about
  /** Persist into video_scripts? Default true. */
  persist?: boolean
}

export async function runVideoCoach(input: VideoCoachInput): Promise<VideoScript> {
  const duration = Math.max(15, Math.min(180, Math.round(input.durationSec || 60)))
  const system = withVoice(
    'You are a video director coaching an indie founder. You write a SHOT LIST '
    + 'for the requested scenario — not generic advice. Each shot has a start/end '
    + 'second, VO ≤ 25 words, shot type (CU/MS/screencast/B-roll), b-roll cue, and '
    + 'an on-screen text overlay. Pace = shots ≤ 5 seconds each. Reply with ONLY '
    + 'a JSON object.',
    input.workspace.voice,
  )
  const user = [
    `WORKSPACE CONTEXT:\n${workspaceContext(input.workspace)}`,
    '',
    `SCENARIO: ${SCENARIO_LABEL[input.scenario]} — ${SCENARIO_PROMPT_HINTS[input.scenario]}`,
    `DURATION: ${duration} seconds`,
    `TOPIC: ${input.topic.slice(0, 600)}`,
    '',
    'Return JSON exactly:',
    '{',
    '  "title": "<8-12 word video title>",',
    '  "shot_list": [',
    '    {"t_start": 0, "t_end": 3, "vo": "<≤25 words>", "shot": "<CU|MS|screencast|B-roll>", "b_roll": "<what to cut to or screen action>", "on_screen_text": "<≤6 words>"},',
    '    ...',
    '  ],',
    '  "notes": "<1-2 sentences of overall pacing/style advice>"',
    '}',
    '',
    `Cover ALL ${duration} seconds. Aim for ${Math.ceil(duration / 5)}-${Math.ceil(duration / 3)} shots.`,
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 2400, temperature: 0.5 })
  const parsed = extractJson<RawScript>(raw)

  const shot_list = (parsed?.shot_list || []).map((s) => ({
    t_start: Math.max(0, Number(s.t_start) || 0),
    t_end: Math.max(0, Number(s.t_end) || 0),
    vo: String(s.vo || '').slice(0, 200),
    shot: String(s.shot || '').slice(0, 60),
    b_roll: String(s.b_roll || '').slice(0, 200),
    on_screen_text: String(s.on_screen_text || '').slice(0, 100),
  })).filter((s) => s.t_end > s.t_start)

  const script: VideoScript = {
    workspace_id: input.workspace.id,
    scenario: input.scenario,
    duration_sec: duration,
    title: parsed?.title || `${SCENARIO_LABEL[input.scenario]} — ${input.topic.slice(0, 40)}`,
    shot_list: shot_list.length > 0 ? shot_list : [{
      t_start: 0, t_end: duration, vo: 'Agent unavailable — set MINIMAX_API_KEY.',
      shot: 'CU', b_roll: '', on_screen_text: '',
    }],
    checklist: PRE_SHOOT_CHECKLIST,
    external_tools: TOOL_RECOMMENDATIONS[input.scenario],
    pre_upload: PRE_UPLOAD_CHECKLIST,
    notes: parsed?.notes,
  }

  if (input.persist !== false) {
    try {
      const admin = createAdminClient()
      const { data } = await admin
        .from('video_scripts')
        .insert({
          workspace_id: script.workspace_id,
          scenario: script.scenario,
          duration_sec: script.duration_sec,
          title: script.title,
          shot_list: script.shot_list,
          checklist: script.checklist,
          external_tools: script.external_tools,
          pre_upload: script.pre_upload,
        })
        .select('id, created_at')
        .single()
      if (data) {
        script.id = data.id as string
        script.created_at = data.created_at as string
      }
    } catch (err) {
      console.error('[video-coach] persist failed:', (err as Error).message)
    }
  }

  return script
}

export async function listVideoScripts(workspaceId: string): Promise<VideoScript[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('video_scripts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(40)
  return (data || []).map((r) => ({
    id: r.id as string,
    workspace_id: r.workspace_id as string,
    scenario: r.scenario as VideoScenario,
    duration_sec: r.duration_sec as number,
    title: r.title as string,
    shot_list: (r.shot_list as VideoScript['shot_list']) || [],
    checklist: (r.checklist as string[]) || [],
    external_tools: (r.external_tools as VideoScript['external_tools']) || [],
    pre_upload: (r.pre_upload as string[]) || [],
    created_at: r.created_at as string,
  }))
}
