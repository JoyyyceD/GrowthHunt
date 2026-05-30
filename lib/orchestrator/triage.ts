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
import { coreBlock } from './memory'
import { routeCatalogForPrompt, scrubFakeUrls } from './routes'

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
  memory_core_update:        { en: 'pin to core memory',         zh: '钉到核心记忆' },
  memory_archival_insert:    { en: 'save to long-term memory',   zh: '存入长期记忆' },
  memory_search:             { en: 'search saved memory',        zh: '搜索已存记忆' },
  schedule_post:             { en: 'schedule / publish a post',  zh: '排期 / 发布帖子' },
  list_scheduled_posts:      { en: 'scheduled-post queue',       zh: '已排期队列' },
  open_scheduler:            { en: 'scheduler page',             zh: '排期发布页面' },
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
  // Memory verbs — the agent should ACTUALLY call the tool, not just say it will.
  { keywords: ['存到记忆', '存入记忆', '存到长期记忆', '长期记忆', '保存洞察', '记下来', '记一下', 'save to memory', 'remember this', 'archive this', 'note this'], tool: 'memory_archival_insert' },
  { keywords: ['钉到记忆', '钉住', '核心记忆', '固定记忆', '记住我', '记得我', 'pin to memory', 'core memory', 'always remember', 'remember that I'], tool: 'memory_core_update' },
  { keywords: ['查记忆', '搜记忆', '搜索记忆', '搜一下记忆', '搜一下我的记忆', '查我的记忆', '翻一下记忆', '我之前说过', '我记得我说过', '我以前说过', 'recall', 'search memory', 'what did I tell you', 'what did I say about'], tool: 'memory_search' },
  // Scheduling / publishing via Postiz.
  { keywords: ['排期', '定时发', '定时发布', '排一下', '排到', '安排发', '帮我发', '发布到', '发到', '发推', '发帖', 'schedule', 'schedule for', 'publish', 'post this', 'post to', 'queue this'], tool: 'schedule_post' },
  { keywords: ['排了哪些', '我的队列', '排期队列', '查看排期', '看一下排期', "what's scheduled", 'my queue', 'scheduled posts', 'show queue'], tool: 'list_scheduled_posts' },
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

export async function triageMessage(ws: Workspace, history: GtmMessage[], message: string, pageContext?: string): Promise<TriageResult> {
  const catalog = buildToolCatalog(ws)
  const synonyms = buildZhSynonymTable()
  const core = await coreBlock(ws.id)

  const system = withVoice(
    [
      'You are the GrowthHunt GTM mission-control agent — a senior growth operator who DOES things, not a chatbot that asks back.',
      '',
      'PRIME DIRECTIVE: pick a tool and run it on the FIRST turn whenever possible. The user came here to get work done; bouncing the question back is a failure. Default = action. Only chat-only when there is literally no tool that could move the ball forward (pure greeting, pure thanks, pure opinion question with no actionable angle).',
      '',
      'WHEN THE USER ASKS "WHAT CAN YOU DO" / "HOW DO I USE X" / "你能干啥" / "怎么使用 xgrower":',
      '  - This is NOT a chit-chat — it is a request for a guided demo. DO NOT just describe in 2 sentences.',
      '  - PICK a concrete first move from the catalog (usually get_workspace, list_recent_runs, or routing to /xgrower) and run it now.',
      '  - Your reply is 3-6 sentences: tell them what you ARE doing now, what the next 2 steps look like, and end with "I\'ll start with X — say the word for the next one."',
      '',
      'WHEN THE USER ASKS ABOUT XGROWER / X COMMUNITY OPS / X 社区运营:',
      '  - tool_hint = "open_landing_doctor" is wrong. Use:',
      '      * "install xgrower" / "怎么安装" → reply with the install link (/xgrower/install) and route there.',
      '      * "how to use xgrower" / "xgrower 怎么用" → route /xgrower (set tool_hint=open_post_roi as a no-op? NO — use needs_tools=true with a clear plan). In doubt, route /xgrower in the reply text and run get_workspace so user sees state.',
      '      * "scan community" / "扫一下 X / Reddit" → radar_scan.',
      '      * "draft a tweet/post" / "帮我写帖子" → draft_distribution (needs voice; if not trained, run train_voice first).',
      '  - Always link the relevant page in the reply ([install →](/xgrower/install), [open xgrower →](/xgrower)).',
      '',
      'LANGUAGE: Match the user\'s language exactly (中文/English/etc). Never code-switch.',
      '',
      'TOOL NAMING — STRICT:',
      '- Internal snake_case identifiers (radar_scan, quick_geo_audit, …) are PROGRAMMATIC; only put them in tool_hint. NEVER in the reply text.',
      '- In the reply, use the display label or natural English/中文.',
      '',
      'REPLY SHAPE:',
      '  - 3-6 sentences (not 1-2). Concrete. State exactly what you\'re about to do and what they\'ll see next.',
      '  - Include relevant deep links as markdown ([open xgrower →](/xgrower)).',
      '  - End with a forward-leaning CTA or the next handle ("say \'send it\' to dispatch", "want me to also pull competitors?").',
      '  - No empty acknowledgements ("好的，我可以帮你"). No paraphrasing the user. No "请告诉我更多". Just move.',
      '',
      'URL DISCIPLINE — CRITICAL:',
      '  - You may ONLY link to URLs from the ROUTE CATALOG below. NEVER invent paths like /train-voice, /audit-results, /create-ab-test, /memory, /landing-doctor.',
      '  - If the right page is not in the catalog, write plain prose with NO markdown link instead.',
      '  - Always use the catalog\'s exact spelling, including `?ws=<id>` query strings where shown.',
      '  - When uncertain, the safest deep link is `/gtm/tasks/<task_id>` (only valid AFTER a tool returns a task_id — never invent task ids).',
      '',
      'Return ONLY a JSON object — no fences, no prose around it:',
      '{ "reply": "<your 3-6 sentence reply in user\'s language with the plan + links + CTA>", "needs_tools": true|false, "tool_hint": "<internal_tool_name | omit>" }',
    ].join('\n'),
    ws.voice,
  )
  const user = [
    `WORKSPACE:\n${workspaceContext(ws)}`,
    '',
    core ? `LONG-TERM MEMORY (workspace facts the agent has saved across sessions — treat as known truths):\n${core}\n` : '',
    pageContext ? `PAGE CONTEXT — what the user is looking at RIGHT NOW (use this to resolve pronouns like "this task", "这个", "my landing page"):\n${pageContext.slice(0, 2000)}\n` : '',
    'TOOL CATALOG (internal identifiers go in tool_hint ONLY; reply uses display labels or natural language):',
    catalog,
    '',
    'CHINESE INTENT → INTERNAL TOOL (use to set tool_hint when user writes Chinese):',
    synonyms,
    '',
    'ROUTE CATALOG — the ONLY URLs you may write in markdown links. Substitute the literal workspace id where shown; do NOT write placeholders like `<id>` to the user:',
    routeCatalogForPrompt(ws),
    '',
    'EXTRA INTENT ROUTING (X / xgrower / install / community ops):',
    '  - "xgrower" / "X 社区" / "X community" / "X 运营" → tool_hint=get_workspace, mention /xgrower in reply',
    '  - "怎么安装 xgrower" / "install xgrower" → tool_hint=get_workspace, link [install →](/xgrower/install) in reply',
    '  - "怎么使用 xgrower" / "how to use xgrower" → tool_hint=get_workspace, link [open xgrower →](/xgrower) AND say you\'ll run a workspace summary first',
    '  - "扫一下 X" / "scan twitter" / "find leads on X" → tool_hint=radar_scan',
    '  - "起草帖子" / "draft a post" / "write me a tweet" → tool_hint=draft_distribution',
    '',
    'RECENT CONVERSATION:',
    historyTranscript(history),
    '',
    `NEW USER MESSAGE:\n${message}`,
    '',
    'Decision rules for needs_tools (STRONG BIAS TO TRUE — pick a tool unless it\'s genuinely impossible):',
    '',
    'TRUE (run a tool) — when ANY of these hold:',
    '  - User used an imperative verb: audit, draft, run, scan, find, create, snapshot, refresh, generate, train, build, post, send, save, remember, recall, archive / 跑, 审, 扫, 抓, 找, 生成, 起草, 训练, 发, 发布, 启动, 教, 演示, 存, 记, 保存, 钉, 搜.',
    '  - User said "save/remember/记下" or "search memory/查记忆" — this is a memory operation, not a chat. Call the appropriate memory tool.',
    '  - MEMORY HEURISTIC: if the user message contains the word "记忆" / "memory" AND any verb (search/搜/查/找/recall/回忆/翻 to read; save/存/记/保存/钉 to write), it is ALWAYS a memory tool call — never reply with `chat`. Pick memory_search for read intents, memory_archival_insert for write intents, memory_core_update only when the user says "钉" / "pin" / "always remember".',
    '  - User asked "what can you do" / "你有什么功能" / "how do I use X" / "怎么使用" — pick get_workspace OR a representative tool to demo capability.',
    '  - User named a product feature (xgrower, OPChampion, GEO audit, ICP, voice, radar, …) — pick the matching tool/route.',
    '  - There is ANY tool whose default behavior would produce useful info — pick it.',
    '',
    'FALSE (just chat back) — ONLY for:',
    '  - Pure greetings ("hi", "你好"), pure thanks, pure goodbyes.',
    '  - Pure philosophical / opinion asks with no actionable angle ("do you think AI will replace marketing?").',
    '  - The user is mid-clarification of a previous answer ("wait, what did you mean by X?"). Even then prefer tool if a tool would clarify.',
    '',
    'STYLE GUARDRAILS:',
    '  - DO mention the SPECIFIC tool you\'re kicking off and what the user will see next.',
    '  - DO write fresh sentences each turn; do NOT repeat phrasing across turns.',
    '  - DO NOT open with "好的，我可以帮你..." / "我理解你想..." / "I understand you want..." — filler.',
    '  - DO NOT close with ANY question that asks the user to choose between options ("请告诉我您想了解哪个", "请告诉我更多细节", "您想先看哪个", "what would you like to focus on?", "which one interests you?"). End with a single concrete CTA OR a single yes/no question tied to a specific next action ("要我接着跑 ICP 吗？", "say \'send it\' to dispatch").',
    '  - DO NOT leak snake_case tool names (radar_scan, quick_geo_audit, …).',
    '  - DO use BARE paths in markdown links (e.g. `/agents/radar?ws=…`) — never prepend `https://growthhunt.ai`. The scrubber will rewrite absolute URLs, but bare paths are cleaner.',
    '',
    'Return JSON only — no fences, no prose around it.',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 600, temperature: 0.4 })
  if (!raw) {
    return { reply: 'Got it — pulling your workspace summary so I can recommend the right next move. Stand by.', needs_tools: true, tool_hint: 'get_workspace' }
  }
  const parsed = extractJson<{ reply?: unknown; needs_tools?: unknown; tool_hint?: unknown }>(raw)
  if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
    return { reply: 'Got it — pulling your workspace summary so I can recommend the right next move. Stand by.', needs_tools: true, tool_hint: 'get_workspace' }
  }
  // Defensive: strip leaked snake_case tool names AND hallucinated URLs.
  const cleaned = scrubFakeUrls(scrubToolNames(parsed.reply.slice(0, 800)))
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
