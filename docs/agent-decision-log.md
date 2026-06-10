# AI 营销队友：完整计划决策清单

> 工作文档：所有细节在此逐条敲定后再开工。
> 配套：[agent-product-upgrade.md](./agent-product-upgrade.md)（产品方案）· [agent-architecture.md](./agent-architecture.md)（架构）
> 状态标记：✅ 已定 · 🔶 待讨论 · ⬜ 依赖前置决策

---

## 已定决策（前两轮讨论）

- ✅ **入口策略**：新路由并行，现有 /gtm 和垂直页不动，验证后逐步迁移
- ✅ **v1 范围**：Onboarding wow（URL→知识库）+ 对话工作台 + 文件页；心跳/日历/计费放 v2
- ✅ **拟人化**：完整拟人（名字+头像+第一人称+Hire 话术）
- ✅ **模型分层**：编排层 Claude（Sonnet 主循环 + Haiku triage），垂直 agent 留 MiniMax
- ✅ **Build vs Buy**：抓取/搜索/logo 买，OAuth 发布/prompt/闭环自持
- ✅ **Artifact 化输出**：新表 agent_artifacts + rev 版本 + 流式卡片

---

## 批次 1：产品根基（影响所有后续决策）

- 🔶 **1.1 目标市场与语言**：首批用户是中文出海 founder、纯英文市场、还是双语？
  → 影响：persona 语言、UI 语言、搜索 API 选型（Tavily 中文弱）、测试 URL 集、6 份文档的默认语言
- 🔶 **1.2 Persona 名字与形象**：动物拟人方向？候选名？
  → 影响：路由命名、域名/handle、全部 UI 文案、头像设计
- 🔶 **1.3 Onboarding 输入形式**：只要 URL？URL+一句话 brief？还是 URL+3 个可选问题？
- 🔶 **1.4 知识库编辑权**：用户只能让 agent 改文档，还是也能直接编辑 markdown？
  → 影响：文件页交互、rev 体系、"agent 是否总知道最新版"的一致性

## 批次 2：Onboarding pipeline 细节 ✅ 已敲定（2026-06-10）

详见 [agent-onboarding-spec.md](./agent-onboarding-spec.md)。决策：
- ✅ **2.1 文档清单 = 7 份**（用户确认按 Ollie 原版，market-research 单独成篇）：business-profile / brand-guidelines / audience-persona / social-strategy / first-week-calendar / competitor-deep-dive / market-research。逐份 outline 已冻结（spec §1）
- ✅ **2.2 BrandIntelligence schema** 冻结（spec §2），存 agent_tasks.result 供重生成复用
- ✅ **2.3 旁白脚本**（spec §3）：每条旁白必须夹带真实发现
- ✅ **2.4 兜底**（spec §4）：抓站失败转 Scout 对话式三问；搜索失败跳过竞品/市场两篇并明示，不编数据
- ✅ **2.5 验收**（spec §5）：5 维评分，平均 ≥4 无单项 ≤2，10 个测试 URL 全过
- ✅ **2.6 首周日历联动队列**：生成后同步写入 gtm_scheduled_posts（status=proposed）
- ✅ **2.7 引用策略**：来源名即可（Ollie 模式）+ 硬规则"搜索结果里没有的数据不许写"
- ✅ **2.8 Assets v1 范围**：仅上传 + 自动抓 logo/色板；AI 配图 v2

## 批次 3：工作台与文件页 UX ✅ 已敲定（2026-06-10）

- ✅ **3.1 三栏布局**：左 = workspace 切换 + Scout Direct Chat + Topic Chats + 导航（Files/Assets/Integrations/Calendar 灰显/Settings）；中 = 对话流 + artifact 卡片 + 过程行；右 = Upcoming 队列 + Knowledge Base 文件列表 + Brand assets
- ✅ **3.2 Artifact 卡片**：流式打字机 → 完成后折叠 ~300px；按钮 Expand/Copy/Download .md；**无 Regenerate 按钮**（重写走对话）
- ✅ **3.3 会话模型**：多主题会话（复用 conversations.ts），onboarding 自动置顶为 "Brand learning · {domain}"，Scout Direct Chat 常驻
- ✅ **3.4 入口状态机**：/scout 无 workspace → 全屏 hero（URL 大输入框 + 可选补充 + Scout 形象）；提交即建 workspace 并切入三栏，中栏播旁白，右栏文件逐份点亮
- ✅ **3.5 队列交互（v1）**：可点开看全文、编辑文案、approve；未连平台时 approve 引导至 Integrations——onboarding → 连接 → 发布的转化链路 v1 完整
- ✅ **3.6 中栏块类型清单（冻结，2026-06-10 补）**：文本消息 / 过程行 / Artifact 卡片（看：折叠/Copy/Download）/ Post 卡片（操作：平台+hook类型+字数+Edit/Queue+状态徽章）/ 建议芯片 / ask_user 卡片。SSE 事件契约对应扩展为 5 种：text_delta / step / artifact_delta+done / post_drafts / ask_user（4.2 同步更新）
- ✅ **3.8 文档阅读视图（2026-06-10 补）**：富渲染（sliders 进度条/色板色块/表格），不展示 md 源码；编辑入口 = 文档底部 "Ask Scout to change this doc" 输入条（跳回对话带文档上下文）；rev 仅查看历史无 diff/回滚；对话内 Expand 与 Files 页共用渲染组件
- ✅ **3.9 视觉**：延续 GrowthHunt V1 Editorial（暖白 #fafaf7 + 橙 #e84e1b + Instrument Serif 标题 + mono eyebrow）；右栏可折叠
- ✅ **3.7 界面状态机（4 态）**：① hero（首访）② onboarding 进行中（旁白+文档点亮）③ 日常对话 ④ 回访空状态（Scout 给 2–3 个建议芯片，v1 静态规则生成，v2 由心跳驱动）。视觉细节/动效/移动端降级不冻结，开发期迭代

## 批次 4：技术契约 ✅ 已敲定（2026-06-10）

- ✅ **4.1 v1 工具清单（16 个）**：get_workspace / update_workspace / run_onboarding / get_task_status / artifact_list / artifact_read / artifact_create / artifact_update / web_search / fetch_page / draft_posts / schedule_posts / list_scheduled_posts / memory_upsert / memory_search / ask_user。垂直长尾工具 v1 不注册，v2 按质量逐个放入
- ✅ **4.2 状态机**：scraping → researching → synthesizing → drafting → done/failed；SSE 事件：status / artifact_delta / artifact_done
- ✅ **4.3 fork（2026-06-10 升级为"纯新增"铁律）**：不止 fork 路由，整个编排层新写——新增 lib/scout/（新 loop + 16 工具 + providers）、app/scout/、app/api/scout/。**现有代码只 import 不修改**（lib/agents、adapters、workspace store、memory 当库用）；**数据库只加表/加行不改结构**（gtm_scheduled_posts 用新状态值 proposed，cron 只捞 scheduled，惰性安全）；/gtm 与垂直页零改动（triage 换 Haiku 也取消，留给 v2 收拢期）。新 loop 因原生 tool use 无需 JSON 容错层，体积约为旧 loop 1/3。代价：双 loop 并存的临时重复，v2 验证后收拢或弃新
- ✅ **4.4 模型与预算**：主循环 claude-sonnet-4-6（原生 tool use），triage claude-haiku-4-5；硬顶：onboarding ≤100k tokens、单轮 ≤30k、单 workspace ≤$3/天
- ✅ **4.5 抓取/搜索**：Jina Reader（免费层）+ page-fetch 兜底，量大再升 Firecrawl；搜索 Tavily（免费档 1000 次/月起步）
- ✅ **4.6 Context 注入**：workspace 核心字段 + 7 文档标题与 200 词摘要（生成时顺产），全文按需 artifact_read，底噪 ~3k tokens/轮
- ✅ **4.7 Loop 策略**：升级现有 loop.ts，不采用 Claude Agent SDK（运行环境/多租户/功能集均不匹配 SaaS 场景）。具体：裸 @anthropic-ai/sdk + 原生 tool use 替代 JSON 正则、细粒度流式事件映射 SSE、开启 prompt caching（系统提示+知识库摘要，对话成本降约 90%）、循环骨架（步骤落库/权限/MAX_STEPS）保留
- ✅ **4.8 商业模式基线**：对话免费限量（每日条数/credits）+ 发布自动化付费（价值定价而非成本定价，Ollie 同构）；onboarding 免费作获客投资；v1 内测全免费+白名单，T12 限额为此铺路

## 批次 5：排期、验收与内测 ✅ 已敲定（2026-06-10）

- ✅ **5.1 里程碑与验收**：并入 [agent-build-plan.md](./agent-build-plan.md) 各任务 AC
- ✅ **5.2 内测方案**：渠道 = 用户自己的社交网络 + build in public 招募（X 公开开发进程附内测报名，兼作发布预热）；最低门槛 3 个真实外部用户走通全链路（T13 AC）
- ✅ **5.3 成本**：内测期月预算 ~$100–200（约 200–400 次 onboarding）；防线 = 单 workspace $3/天 + onboarding 100k token 硬顶 + 免费 1 workspace/用户
- ✅ **5.4 v1→v2 判据**：≥50% 内测用户 approve 过至少 1 条帖子 → 启动心跳与计费开发

## 批次 7：收尾决策 ✅ 已敲定（2026-06-10）

- ✅ **7.1 路由名 = /scout**（app/scout、app/api/scout，全部文档已替换；未来可升级 scout 子域）
- ✅ **7.2 登录时机**：v1 先登录再跑（沿用 Supabase auth，hero 输入 URL 后弹登录）；"先尝后登"留给 v2 公开发布
- ✅ **7.3 免费 workspace 上限 = 1 个**（多品牌是付费理由之一；堵死匿名/多开刷 onboarding 成本的漏洞）
- ✅ **7.4 长任务运行方式**：不引入任务队列基建——onboarding 在 SSE 请求内跑完（Vercel Pro maxDuration=300s，目标 90s），进度落库 agent_tasks，断线刷新从库恢复
- ✅ **7.5 模型双轨（2026-06-10 最终版）**：统一走 **OpenRouter**（单 key、OpenAI 协议，provider 层只需一种协议——比原计划还省半天工）。开发期（T1–T9 管道）：`nvidia/nemotron-3-super-120b-a12b:free`（实测 tool calling 正确且快；550b:free 排队慢仅作备用）。验收/生产主循环：经 OpenRouter 调 Claude Sonnet（充值即用）。⚠️ 两条铁律：① :free 模型仅限开发自测——免费档限额低且数据可能被上游用于训练，**内测真实用户数据必须走付费模型**；② T4/T10 文档质量验收仍必须在 Claude 上做
- ✅ **7.6 搜索选型变更**：默认改为 **Serper.dev（Google 结果）+ Jina 读正文**，替代 Tavily（成本更低、Google 排名质量更好、Jina 层本就存在）；web_search 工具做成接口抽象可切换
- 📍 **Key 进度**：Jina ✅ · Serper ✅ · OpenRouter ✅ · **DeepSeek ✅（2026-06-10 用户提供，已设为开发默认）**。唯一余项：质量验收前给 OpenRouter 充值解锁 Claude
- ✅ **7.7 开发模型改为 DeepSeek（deepseek-chat）**：免费 Nemotron 实测两次静默断流/截断且排队 2-15 分钟；DeepSeek tool call 5 秒、$0.0001/次。client.ts 按模型名自动切 provider（deepseek* → api.deepseek.com，其余 → OpenRouter），同一 OpenAI 协议零结构改动。Nemotron 免费档保留为兜底
- ✅ **7.8 防断改造（实测踩坑后定稿为 fire-and-poll）**：onboard 路由立即返回 {workspaceId, taskId}，流水线在 after(回调) 中完全脱离请求作用域运行，前端轮询 scout_tasks 渲染里程碑。教训链：① 客户端断开会中止请求作用域内的一切 fetch（after(promise) 救不了已在请求内启动的工作）② **Next dev 下长流式响应会静默截断**（合成参数 JSON 在字符串中间被切）——结构化（强制工具）调用一律 stream:false 走普通 JSON 响应；流式仅保留给有人看打字机的场景
- ✅ **7.9 E2E 验收通过（2026-06-10，cal.com 实测）**：hero→登录→onboarding（~3 分钟，DeepSeek）→7 文档（rev 体系）→7 帖子入队（Day1-7、7 种 hook、含 Reddit + 真实来源引用 Precedence Research）→approve 闸门（未连平台正确引导 Integrations）→对话轮（多步工具+队列快照表+ask_user 芯片）→文件页富渲染。已知质量项留 W3：个别数字（如 "$1,860/year"）疑似推算需在 Claude 验收时按 2.7 规则收紧

---

## 批次 6：差异化升级 ✅ 已敲定（2026-06-10）

对标 Ollie 的三个 v1 差异化点（用户确认全部放进 v1）：
- ✅ **6.1 真实案例引擎**：Scout 生成 social-strategy / first-week-calendar 时检索 Growth Story 案例库（27+ 真实案例），文档内出现 "modeled on {case}" 引用并链接 growth-story 页（顺带主站导流）。Ollie 抄不走的数据资产
- ✅ **6.2 "不编数据"升级为公开卖点**："Every stat is sourced, or it doesn't ship."（内部规则 2.7 的营销化）
- ✅ **6.3 Reddit 渠道**：social-strategy 渠道池含 Reddit（subreddit 级建议），队列支持发 Reddit（adapter 已建成）。差异化叙事：真转化渠道 vs Ollie 的纯品牌渠道
- 📋 v2 路线图记录：④ ROI 学习闭环（"she learns what works for your audience"）⑤ 帖子→落地页→AB 整链 ⑥ 免费层更慷慨的价格刀法

## 决策记录

### 批次 1（2026-06-10 敲定）

- ✅ **1.1 目标市场**：纯英文全球市场。UI/persona/文档/旁白全英文；搜索只接 Tavily；测试 URL 选全球产品。与 Ollie 正面竞争，差异化靠 Growth Story 案例库背书 + 工具深度（outreach/radar 等 Ollie 没有的能力）。
- ✅ **1.2 Persona**：Scout（GrowthHunt 的侦察兵隐喻）。形象方向：侦察犬/狐狸，待出头像三态。
- ✅ **1.3 Onboarding 输入**：URL 必填 + 一个可跳过的补充框（"Anything I should know? e.g. target audience or current goal"）。
- 🔶 **1.4 编辑权**：未直接回答，默认采用推荐方案（v1 仅 agent 改 + rev），上线前可复议。
- ✅ **1.5（新增）功能版图对齐 Ollie 完整形态**，用户明确点名：assets、管理发布、已发内容、互动。版本归属：
  - **Assets（素材库）**：上传图片供配图引用 + 自动抓 logo/色板 → 提前到 **v1**（工程量小：一张表 + 上传 + 网格页）
  - **发布管理（队列+日历）**：v2（沿用 gtm_scheduled_posts，加 Proposed 状态 + 日历视图）
  - **已发内容（Activity 流）**：v2（已发/排队帖子的时间流，数据现成）
  - **互动（Engagement，回评论/转发监测）**：**v3**。难点不在我们：读取评论需要各平台付费/受限 API（X API 读取贵、LinkedIn 评论 API 审核严）。v1 先把"互动规则"写进 social-strategy 文档，v3 再做半自动回复建议。
