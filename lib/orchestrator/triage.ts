/**
 * Triage stage — the missing "chat" layer.
 *
 * Before entering the ReAct loop, ask MiniMax for a fast conversational reply
 * plus a yes/no on whether a tool call is needed. This solves the "agent jumps
 * straight to tools" problem and gives the user a genspark-style preamble
 * bubble ("got it, let me audit that…") that arrives before any work runs.
 *
 * Returns:
 *   - reply        : 1-3 sentence conversational reply, ALWAYS surfaced
 *   - needs_tools  : when false, that reply IS the final answer
 *   - tool_hint    : optional suggestion to nudge the ReAct loop's first step
 *
 * One MiniMax call, ~1s, ~400 tokens.
 */
import { callAgent, extractJson, workspaceContext, withVoice } from '@/lib/agents/llm'
import type { Workspace } from '@/lib/workspace/types'
import type { GtmMessage } from './types'
import { enabledTools } from './tools'

export interface TriageResult {
  reply: string
  needs_tools: boolean
  tool_hint?: string
}

/**
 * User-facing display labels per tool. Internal tool names (snake_case) are
 * NEVER surfaced to the user — the model is told to write only natural
 * language using these labels. EN + 中文 so we match the user's language.
 *
 * Tools not in this map fall back to a generic "the right tool" phrasing.
 */
const DISPLAY: Record<string, { en: string; zh: string }> = {
  quick_geo_audit:           { en: 'AI-citation (GEO) audit',   zh: 'AI 引用 / GEO 审计' },
  landing_audit:             { en: 'landing-page conversion audit', zh: '落地页转化审计' },
  run_icp_agent:             { en: 'ICP & positioning draft',   zh: 'ICP / 定位起草' },
  train_voice:               { en: 'founder voice trainer',     zh: '创始人语调训练' },
  radar_scan:                { en: 'Reddit + HN community scan', zh: 'Reddit + HN 社区雷达扫描' },
  competitor_scan:           { en: 'competitor snapshot + diff', zh: '竞品页面快照对比' },
  draft_creator_outreach:    { en: 'creator DM drafts',          zh: '创作者私信起草' },
  draft_cold_email:          { en: 'cold-email drafts',          zh: '冷邮件起草' },
  draft_distribution:        { en: 'multi-platform post variants', zh: '多平台分发文案生成' },
  create_ab_test:            { en: 'A/B test setup',             zh: 'A/B 测试' },
  post_roi_digest:           { en: 'your X-post ROI digest',     zh: '本人 X 帖子 ROI 摘要' },
  daily_trend_digest:        { en: "today's trend-tweet digest", zh: '每日蹭热度推文摘要' },
  launch_orchestrator_init:  { en: 'multi-platform launch plan', zh: '多平台发布编排' },
  video_coach_script:        { en: 'short-form video shot list', zh: '短视频分镜脚本' },
  list_recent_runs:          { en: 'recent agent runs',          zh: '近期执行历史' },
  get_workspace:             { en: 'workspace summary',          zh: 'workspace 概况' },
  start_playbook:            { en: 'a playbook',                 zh: '一个 playbook' },
  start_workflow:            { en: 'a workflow',                 zh: '一个 workflow' },
  spawn_agents:              { en: 'multiple agents in parallel', zh: '并行多 agent' },
  open_voice_trainer:        { en: 'voice trainer page',         zh: '语调训练页面' },
  open_landing_doctor:       { en: 'landing doctor page',        zh: '落地页诊所页面' },
  open_post_roi:             { en: 'post-ROI page',              zh: 'Post ROI 页面' },
  answer:                    { en: 'plain answer',               zh: '直接回答' },
}

/**
 * Chinese synonym map → tool name. When the user writes Chinese intent words,
 * we want the model to confidently pick the right internal tool name even if
 * the catalog is rendered in English.
 */
const ZH_SYNONYMS: Array<{ keywords: string[]; tool: string }> = [
  { keywords: ['GEO', '审计', '审一下', 'AI 引用', 'AI引用', 'citation'], tool: 'quick_geo_audit' },
  { keywords: ['落地页', '转化', '转化率', 'landing'], tool: 'landing_audit' },
  { keywords: ['雷达', '扫描', 'Reddit', '社区', 'HN', 'Hacker'], tool: 'radar_scan' },
  { keywords: ['竞品', '竞争对手', '对手', 'competitor'], tool: 'competitor_scan' },
  { keywords: ['ICP', '定位', '人群'], tool: 'run_icp_agent' },
  { keywords: ['语调', '声音', '音色', 'voice'], tool: 'train_voice' },
  { keywords: ['创作者', '博主', 'KOL', '私信', 'DM'], tool: 'draft_creator_outreach' },
  { keywords: ['冷邮件', 'cold email', 'cold-email'], tool: 'draft_cold_email' },
  { keywords: ['分发', '多平台', '同步'], tool: 'draft_distribution' },
  { keywords: ['A/B', 'AB', 'ab test', '对比测试'], tool: 'create_ab_test' },
  { keywords: ['ROI', '帖子表现', '帖子分析'], tool: 'post_roi_digest' },
  { keywords: ['趋势', '热点', '蹭热点', 'trend'], tool: 'daily_trend_digest' },
  { keywords: ['发布', '上线', 'launch'], tool: 'launch_orchestrator_init' },
  { keywords: ['视频', '分镜', '脚本', 'video', 'shot'], tool: 'video_coach_script' },
  { keywords: ['历史', '近期', '跑过', 'recent'], tool: 'list_recent_runs' },
  { keywords: ['workspace', '我的设置', '我的资料'], tool: 'get_workspace' },
]

function buildToolCatalog(ws: Workspace): string {
  return enabledTools(ws).map((t) => {
    const d = DISPLAY[t.name]
    const labels = d ? `display="${d.en}" / "${d.zh}"` : 'display=(no label)'
    return `- internal="${t.name}" ${labels}\n    purpose: ${t.description.slice(0, 110)}`
  }).join('\n')
}

function buildZhSynonymTable(): string {
  return ZH_SYNONYMS.map((row) => `  ${row.keywords.join(' / ')} → ${row.tool}`).join('\n')
}

function historyTranscript(history: GtmMessage[]): string {
  const slice = history.slice(-6)
  if (slice.length === 0) return '(no prior turns)'
  return slice.map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 300)}`).join('\n')
}

export async function triageMessage(ws: Workspace, history: GtmMessage[], message: string): Promise<TriageResult> {
  const catalog = buildToolCatalog(ws)
  const synonyms = buildZhSynonymTable()

  const system = withVoice(
    [
      'You are the GrowthHunt GTM assistant — a friendly senior growth advisor.',
      '',
      'CORE PRINCIPLE: Never auto-run tools when the user is asking for advice, opinion, clarification, or chit-chatting. Tools are ONLY for unambiguous task requests. When in doubt, DO NOT run a tool — chat back and ask one clarifying question instead.',
      '',
      'LANGUAGE: Match the user\'s language. If they wrote in Chinese (中文), reply in Chinese. If English, English. Don\'t code-switch unless they did.',
      '',
      'TOOL NAMING — STRICT:',
      '- The `internal` tool identifiers (snake_case, e.g. radar_scan, quick_geo_audit) are PROGRAMMATIC. NEVER write them in your reply.',
      '- When you mention what you\'ll do, use the `display` label matching the user\'s language, OR plain natural description.',
      '- DO write: "I\'ll run an AI-citation audit" / "我帮你跑一下 Reddit + HN 雷达扫描"',
      '- DO NOT write: "I\'ll use the quick_geo_audit tool" / "使用 radar_scan 工具" / "雷达_audit"',
      '',
      'For each user message:',
      '1. ALWAYS write 1-3 conversational sentences acknowledging what they want. Warm, tight, NO bullet lists, NO markdown headers, NO tool identifiers.',
      '2. Decide whether the message needs a TOOL CALL (data lookup, agent run, audit, scan, draft) or whether your conversational reply is sufficient.',
      '3. If a tool is needed, set tool_hint to the EXACT internal snake_case name from the catalog (this field is internal — never appears in reply).',
      '',
      'Reply with ONLY a JSON object — no fences, no prose around it:',
      '{ "reply": "<your 1-3 sentence reply in user\'s language>", "needs_tools": true|false, "tool_hint": "<internal_tool_name | omit>" }',
    ].join('\n'),
    ws.voice,
  )
  const user = [
    `WORKSPACE:\n${workspaceContext(ws)}`,
    '',
    'TOOL CATALOG (internal identifiers are for tool_hint field ONLY; reply uses display labels):',
    catalog,
    '',
    'CHINESE INTENT → INTERNAL TOOL (use this to set tool_hint when user writes Chinese):',
    synonyms,
    '',
    'RECENT CONVERSATION:',
    historyTranscript(history),
    '',
    `NEW USER MESSAGE:\n${message}`,
    '',
    'Decision rules for needs_tools:',
    '',
    'TRUE (run a tool) — only when ALL of these hold:',
    '  - User used an imperative action verb in English (audit, draft, run, scan, find, create, snapshot, refresh, generate, train, build, post, send) or in Chinese (跑, 审, 扫, 抓, 找, 生成, 起草, 训练, 发, 发布, 启动).',
    '  - The request is specific OR maps cleanly to a default (e.g. "scan reddit" → radar_scan, "audit my page" → quick_geo_audit defaulting to workspace.url).',
    '  - You can confidently map it via the synonym table or English verbs above.',
    '',
    'FALSE (just chat back) — for any of these:',
    '  - Greetings ("hi", "你好", "嗨"), thank-yous ("thanks", "谢谢"), good-byes.',
    '  - Open-ended advice ("what should I do?", "我现在该做什么", "how do I grow?", "怎么涨粉", "help me grow", "give me ideas").',
    '  - Opinion / explanation asks ("what do you think?", "why does X work?", "为什么", "解释一下").',
    '  - Meta-questions about the assistant ("what can you do?", "你能干啥", "how does this work?").',
    '  - Follow-up clarifications without a new task ("really?", "are you sure?", "wait what?").',
    '  - Ambiguous / underspecified — missing the URL, the count, the target. ASK a clarifying question in your reply (in user\'s language, using display labels for any tools you mention).',
    '',
    'IMPORTANT — DO NOT call start_playbook, run_icp_agent, or any heavy workflow tool just because the user vaguely asked for help. Those require explicit asks.',
    '',
    'BAD REPLY EXAMPLES (do NOT produce these):',
    '  ❌ "您可以使用雷达_audit 工具来扫描"   ← made-up name, leaks identifier',
    '  ❌ "I\'ll call quick_geo_audit for you"  ← leaks identifier',
    '  ❌ "Try the run_icp_agent tool"          ← leaks identifier',
    '',
    'GOOD REPLY EXAMPLES:',
    '  ✓ "I\'ll run an AI-citation audit on growthhunt.ai — give me a few seconds."',
    '  ✓ "好的，我帮你跑一下 Reddit + HN 雷达扫描，几秒就好。"',
    '  ✓ "你是想我帮你写冷邮件，还是直接帮你跑一个 ICP 定位？"',
    '',
    'Return JSON only.',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 400, temperature: 0.4 })
  if (!raw) {
    return { reply: 'Got it. Let me work on that.', needs_tools: true }
  }
  const parsed = extractJson<{ reply?: unknown; needs_tools?: unknown; tool_hint?: unknown }>(raw)
  if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
    return { reply: 'Got it. Let me work on that.', needs_tools: true }
  }
  // Defensive: strip any leaked snake_case tool names from the reply.
  const cleaned = scrubToolNames(parsed.reply.slice(0, 600))
  return {
    reply: cleaned,
    needs_tools: Boolean(parsed.needs_tools),
    tool_hint: typeof parsed.tool_hint === 'string' && parsed.tool_hint.trim() ? parsed.tool_hint.trim() : undefined,
  }
}

/**
 * Last-line defence: if the model still wrote `radar_scan` or `quick_geo_audit`
 * in its reply, swap each occurrence with the matching display label so the
 * user never sees the snake_case identifier.
 */
export function scrubToolNames(text: string): string {
  let out = text
  for (const [name, label] of Object.entries(DISPLAY)) {
    // Match the bare snake_case word; case-insensitive; word-bound on both sides
    // where the boundary is a non-letter (so `quick_geo_audit工具` still matches).
    const re = new RegExp(`(^|[^a-zA-Z0-9_])${name}(?![a-zA-Z0-9_])`, 'g')
    // Use Chinese label if the surrounding text has CJK characters; else English.
    const hasCJK = /[一-鿿]/.test(out)
    out = out.replace(re, `$1${hasCJK ? label.zh : label.en}`)
  }
  return out
}
