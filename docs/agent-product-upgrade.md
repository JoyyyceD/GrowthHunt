# GrowthHunt → AI 营销队友：产品升级开发方案

> 状态：v0 草案 · 2026-06-10
> 决策已对齐：新路由并行（不动现有 /gtm 和垂直页）· v1 以 Onboarding wow 为核心 · 完整拟人化 · 编排层换 Claude，垂直 agent 留 MiniMax

---

## 1. 产品定位

把 GrowthHunt 从「增长工具目录」升级为「AI 营销队友」形态：用户从头到尾只面对一个有名字、有人格的 agent。它在 onboarding 阶段 30–60 秒读懂用户的产品并交付一套品牌知识库文档，之后以这套知识库为底座持续产出内容、排期发布、回收数据。

对标参考：ollieowl.ai（Ollie）。它验证了的 funnel：
**免费体验完整品牌学习（价值前置）→ 知识库沉淀（锁定）→ 付费解锁自动发帖（变现）**

与现有产品的关系：新路由 `/scout`（暂定）并行上线，现有 `/gtm`、垂直工具页（/xgrower、/viralx、/geo…）不动。垂直页长期降级为 SEO 落地页 + agent 能力的展示橱窗，转化目标统一指向 `/scout`。

## 2. Persona 定义（需要先定，文案全依赖它）

- **名字**：待定（候选方向：动物拟人，参考 Ollie the Owl；要可注册域名/社媒 handle）
- **身份**：你的 AI 增长队友（不是助手、不是工具）
- **第一人称**：所有系统消息、生成过程旁白、空状态文案都用「我」
- **话术原则**：
  - 雇佣隐喻：CTA 用「让 TA 入职」/「Hire」而非「开始使用」
  - 过程外显：干活时实时旁白（"我正在读你的首页…"、"我去搜了一下你的竞品…"）
  - 主动语态：空状态写「告诉我今天该发什么」而非「暂无数据」
- **交付物**：persona 名字、头像（3 种状态：待命/工作中/完成）、20 条核心场景文案表

## 3. v1 范围（Onboarding wow + 对话工作台 + 文件页）

### 3.1 核心流程：URL → 品牌知识库

用户输入产品网址（+ 可选一句话补充）→ agent 流式执行并旁白 → 交付 **6 份品牌知识库文档**：

| 文档 | 内容 | 现有基础 |
|---|---|---|
| business-profile.md | 做什么、核心市场、Why Now、变现、增长信号、护城河 | `icp.ts` 部分覆盖 |
| brand-guidelines.md | voice slider 打分、色板（hex）、示例文案、**禁用词清单** | `voice.ts` 部分覆盖 |
| audience-persona.md | 2 个具名 persona：goals/pains/渠道习惯/buying signal | `icp.ts` 的 segments 升级 |
| social-strategy.md | 渠道优先级、频率、内容支柱轮换、互动规则 | 新增 |
| first-week-calendar.md | 首周 7 条可直接发的帖子（hook 类型 × 渠道） | 新增（landing.ts/创作能力复用） |
| competitor-research.md | 竞品拆解 + 市场数据（合并 Ollie 的两份） | `competitor.ts` 部分覆盖 |

技术要点：
- **Artifact 数据层**（新增，v1 最重要的基建）：
  - 新表 `agent_artifacts`：`id, workspace_id, name, kind ('doc'), content_md, rev, created_by ('agent'|'user'), task_id, created_at`
  - 文档可在对话流里以卡片渲染（折叠/展开/Copy/下载 .md），也出现在文件页
  - 每次重跑 rev+1，保留历史
- **生成 pipeline**：复用 `page-fetch.ts` 抓站 + 新增 web search 工具（竞品/市场数据）→ 6 个文档生成器（Claude，流式）。串行旁白、文档间可并行生成。
- **长任务化**：6 份文档超出现有 loop 的 MAX_STEPS=5 / 110s 墙钟。走 `lib/orchestrator/tasks.ts` 的后台任务 + SSE 推进度，对话流里渐进渲染卡片。
- **品牌资产自动抓取**：抓 logo（favicon/og:image）+ 从首页 CSS 提取主色板，存 workspace（现有 `brand_color` 字段扩展为 palette 数组）。

### 3.2 对话工作台 `/scout/[workspaceId]`

- 左栏：persona 卡片（Direct Chat）+ 话题会话列表（复用 `conversations.ts`）+ 导航（文件/日历/集成/设置）
- 中栏：对话流（复用现有 SSE + agent-cards，新增 artifact 卡片类型）
- 右栏：知识库文件列表 + 品牌资产 + Upcoming 队列（v1 只读展示，发布功能 v2 接通）
- 编排层接 Claude（claude-sonnet-4-6）：`loop.ts` 的模型调用抽象出 provider 接口，triage 和 ReAct 主循环走 Claude，垂直 agent（creator/cold-email/radar…）内部继续 MiniMax

### 3.3 文件页 `/scout/[workspaceId]/files`

- 知识库文档列表 + 阅读视图 + Copy / 下载 .md + rev 历史
- 用户可在对话里让 agent 修改文档（"把语气改得更克制" → agent patch 文档 → rev+1）

### 3.4 v1 明确不做

- 多平台 OAuth 新增（沿用现有 X/LinkedIn/Reddit 三个 adapter，不抢做 IG/FB）
- 每日主动心跳（v2）
- Analytics 回拉视图（v2）
- credits / 计费改造（v2，v1 先免费内测）

## 4. v2 范围（让「队友」成立）

1. **每日主动心跳**：cron → `radar.ts` + `trend-digest.ts` → 起草 3 条帖子 → `awaiting_review` 队列 → 用户 approve/edit/reject。复用 `daily_content_sprint.ts` workflow + 现有审批门。
2. **发布日历视图**：周/月视图渲染 `gtm_scheduled_posts`，状态色（Scheduled/Proposed/Published/Failed），拖拽改期。
3. **ROI 学习闭环**：发布后 `post-roi.ts` 自动跑 → 结论写入 `agent_memory` → `workspaceContext()` 注入下次生成。
4. **计费**：免费 = 完整 onboarding + 知识库 + 限 2 平台连接；付费 = 自动发帖 + 心跳 + 更多平台。credits 计量发布次数。

## 5. 开发排期（v1，约 3 周）

| 周 | 内容 |
|---|---|
| W1 | Artifact 数据层 + 表迁移；6 文档生成器 prompt（先跑通 2 份）；loop 模型 provider 抽象 + Claude 接入 |
| W2 | Onboarding 后台任务化 + SSE 进度 + artifact 流式卡片；`/scout` 三栏布局 + 文件页；logo/色板抓取 |
| W3 | 剩余 4 份文档生成器 + 质量打磨（禁用词、文风 taste）；persona 文案全量替换；内测 + 修 bug |

## 6. 关键风险

- **文档质量是产品成败本身**。Ollie 的可怕之处在 taste（禁用词清单、persona 具名具细节）。每份文档需要 prompt 迭代 + 真实网站回归测试集（建 10 个不同行业的测试 URL）。
- **编排成本**：Claude 进主循环后注意 token 预算；triage 可用 Haiku 降本。
- **新旧入口分流**：v1 期间首页不动，`/scout` 仅内测链接进入，避免半成品暴露。
- **抓站失败兜底**：JS 渲染站点 page-fetch 抓不到内容时，降级为「问用户 3 个问题」的人工 brief 流程。

## 7. 待定决策

- [ ] Persona 名字 + 视觉
- [ ] 新路由命名（/agent? /hire? 独立子域?）
- [ ] Claude API key 及预算上限
- [ ] 测试 URL 集（10 个行业）
