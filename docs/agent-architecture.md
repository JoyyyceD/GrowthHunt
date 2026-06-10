# AI 营销队友：功能与技术架构设计

> 状态：v0 草案 · 2026-06-10 · 配套文档：[agent-product-upgrade.md](./agent-product-upgrade.md)
> 原则：**能买不建**。壁垒在知识库质量 + 学习闭环 + persona 体验，不在基础设施。所有非核心能力优先接第三方 API。

---

## 1. 功能架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      /scout 前端（三栏工作台）                  │
│  对话流(SSE) · Artifact卡片 · 文件页 · 日历(v2) · 集成 · 设置     │
└──────────────┬──────────────────────────────────────────────┘
               │ /api/scout/*
┌──────────────▼──────────────────────────────────────────────┐
│                    编排层 Orchestrator                        │
│  ReAct loop (Claude Sonnet) · triage (Claude Haiku)          │
│  工具注册表 · 权限门 · 长任务调度(tasks) · 审批门(workflows)      │
├──────────────────────────────────────────────────────────────┤
│                      能力层（agent tools）                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │ 品牌学习     │ │ 内容生产    │ │ 发布调度     │ │ 情报回收    │ │
│  │ onboarding │ │ post/email │ │ scheduler  │ │ radar/ROI │ │
│  │ pipeline   │ │ /video...  │ │ +adapters  │ │ (v2闭环)   │ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬─────┘ │
├────────┼──────────────┼──────────────┼──────────────┼───────┤
│        ▼              ▼              ▼              ▼        │
│                  共享状态层（Supabase）                        │
│  workspace(brain) · agent_artifacts · agent_memory           │
│  gtm_scheduled_posts · social_connections · agent_tasks      │
├──────────────────────────────────────────────────────────────┤
│                  第三方 API 层（见 §4）                        │
│  Claude · MiniMax · Firecrawl/Jina · Tavily · Brandfetch     │
│  X/LinkedIn/Reddit OAuth · Postiz(长尾平台)                   │
└──────────────────────────────────────────────────────────────┘
```

四个能力域，对应「队友」的工作循环：**学习品牌 → 生产内容 → 发布 → 回收数据反哺学习**。

## 2. 核心模块设计

### 2.1 品牌学习 pipeline（v1 核心）

```
URL 输入
  → [抓站] Firecrawl/Jina：首页 + 自动发现 2-3 个关键页（pricing/about/product）
  → [搜索] Tavily：竞品名 + "{product} alternatives" + 市场数据，3-5 次查询
  → [综合] Claude 单次长上下文调用，产出结构化 BrandIntelligence JSON
  → [并行生成] 6 个文档生成器（Claude，各自独立 prompt + BrandIntelligence 输入）
  → [入库] agent_artifacts ×6 + workspace patch（icp/positioning/voice/palette）
  → [资产] logo（Brandfetch）+ 色板（从 BrandIntelligence 提取）
```

- 整条 pipeline 是一个 **后台任务**（复用 `lib/orchestrator/tasks.ts`），状态机：`scraping → researching → synthesizing → drafting(1..6) → done`
- 每个状态变化通过 SSE 推给前端 → 对话流里渲染旁白（"我正在读你的首页…"）
- 文档生成用 Claude streaming，token 流直接转发到 artifact 卡片（打字机效果）
- 失败兜底：抓站失败 → 降级为 3 问人工 brief；搜索失败 → 跳过竞品文档并明示
- 预估成本/次：抓站 ~$0.02 + 搜索 ~$0.02 + Claude ~40k tokens in / 12k out ≈ **$0.3–0.5/workspace**（免费送得起）

### 2.2 Artifact 层（v1 基建）

```sql
create table agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references gtm_workspaces not null,
  slug text not null,              -- 'business-profile' 等，workspace 内唯一
  title text not null,
  kind text default 'doc',         -- doc | calendar | report（预留）
  content_md text not null,
  rev int default 1,
  created_by text default 'agent', -- agent | user
  task_id uuid,                    -- 产生它的任务，用于溯源
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table agent_artifact_revisions (  -- 每次更新前快照
  artifact_id uuid, rev int, content_md text, created_at timestamptz,
  primary key (artifact_id, rev)
);
```

- 暴露为编排层工具：`artifact_create / artifact_update / artifact_read / artifact_list`
- agent 改文档必须走 `artifact_update`（自动 rev+1 并快照），用户在对话里说"语气改克制点" → loop 调 read → 改写 → update
- 知识库文档在每轮对话注入摘要（título + 200 字摘要进 `workspaceContext()`，全文按需 read），避免 context 爆炸

### 2.3 编排层改造

- `loop.ts` 抽象 `ModelProvider` 接口：`{ complete(messages, opts) }`，实现 ClaudeProvider（主循环+文档生成）/ MiniMaxProvider（垂直 agent 内部）
- triage 换 Claude Haiku（便宜 + 比 MiniMax 稳）；ReAct 主循环换 Claude Sonnet 并启用**原生 tool use**（替代现有"JSON in text + 正则提取"的脆弱方案——这是换模型收益最大的一点）
- MAX_STEPS 保持小（对话轮内 5 步），长活儿一律 spawn 后台任务：新增工具 `spawn_task(pipeline, args)` → 返回 task_id → 前端订阅进度
- 现有 50+ 工具瘦身：v1 的 `/scout` 入口只注册 ~15 个核心工具（workspace 读写、artifact CRUD、onboarding pipeline、内容生成 3-4 个、schedule_posts、memory），垂直长尾工具留在 /gtm 不迁

### 2.4 发布调度（沿用，不动）

现有 `gtm_scheduled_posts` + cron + adapter 架构直接复用。v1 仅把 `schedule_posts` 工具注册进新入口；v2 加 Proposed 状态（心跳草稿）和日历视图。

## 3. API 设计（内部路由）

| 路由 | 方法 | 用途 |
|---|---|---|
| `/api/scout/chat` | POST (SSE) | 对话主入口，复用现有 gtm/chat 改造 |
| `/api/scout/onboard` | POST | 触发品牌学习 pipeline，返回 task_id |
| `/api/scout/tasks/[id]` | GET (SSE) | 任务进度流（状态机 + 文档 token 流） |
| `/api/scout/artifacts` | GET/POST | 列表 / 创建 |
| `/api/scout/artifacts/[id]` | GET/PATCH | 读取（含 rev 历史）/ 更新 |
| `/api/scout/artifacts/[id]/download` | GET | .md 下载 |

约定：所有路由 workspace-scoped，RLS 校验 owner；agent 写操作统一经过编排层工具（前端不直接 PATCH artifact，避免双写路径）。

## 4. 第三方 API 选型（结论：全部可接，无自建必要）

| 能力 | 首选 | 备选 | 费用量级 | 说明 |
|---|---|---|---|---|
| 编排/文档生成 LLM | **Claude API**（Sonnet 主循环 + Haiku triage） | — | ~$0.3/onboarding；对话 ~$0.01-0.05/轮 | 原生 tool use 是关键收益 |
| 垂直 agent LLM | **MiniMax**（现有） | 后续按质量逐个升级 | 现状 | 不动 |
| 网页抓取 | **Firecrawl**（JS 渲染 + markdown 输出） | Jina Reader（r.jina.ai，免费额度大）；现有 page-fetch 做兜底 | $19/mo 起 | 解决现有 cheerio 抓不了 JS 站的问题 |
| Web 搜索 | **Tavily**（为 LLM 设计，返回净化内容） | Serper（便宜）、Exa（语义搜索） | $0.005-0.008/查询 | onboarding 每次 3-5 查询 |
| Logo/品牌资产 | **Brandfetch API** | 自抓 favicon/og:image 兜底（零成本，先用这个） | 免费层够用 | v1 可先纯自抓 |
| 社交发布 | **现有 adapters**（X/LinkedIn/Reddit 自建 OAuth 已完成） | Postiz 兜底长尾平台（现有） | 现状 | 唯一建议自持的"脏活"，因为已经做完了 |
| 配图生成（v2） | 即梦/Recraft/gpt-image | — | 按张计费 | v1 不做 |
| Analytics 回拉（v2） | 各平台官方 API（X/LinkedIn 已有 token） | Postiz 的统计接口 | 免费 | 复用现有 OAuth token |

**Build vs Buy 判断标准**（写下来避免摇摆）：
- **买**：抓取、搜索、logo、图片生成——成熟商品化能力，自建无差异化
- **自持**：社交平台 OAuth + 发布（已建成，是准入壁垒）、编排层、prompt/文档生成器（taste 所在）、ROI 闭环
- **风险注意**：第三方 API 全部走服务端调用并加 per-workspace 限额；Firecrawl/Tavily 的 key 放环境变量，用量打点入库（为将来 credits 计费铺路）

## 5. 数据流（一次完整 onboarding）

```
POST /api/scout/onboard {url}
 → create agent_task(status=scraping) → 返回 task_id
 → [后台] Firecrawl 抓 3 页 → status=researching
 → Tavily ×4 查询 → status=synthesizing
 → Claude 综合 → BrandIntelligence JSON
 → patch workspace (icp_summary/positioning/competitors/palette)
 → status=drafting, 并行 6× Claude streaming
    → 每完成一份: insert agent_artifacts, SSE 推卡片
 → status=done → 对话流插入总结消息（persona 第一人称收尾）
前端: 订阅 /api/scout/tasks/[id]，按状态渲染旁白 + 渐进卡片
```

## 6. 开放问题

- [ ] `/scout/chat` 是 fork 现有 `gtm/chat` 还是抽公共层？（倾向 fork，避免拖累旧入口稳定性，v2 再合并）
- [ ] BrandIntelligence 的 schema 冻结（决定 6 个文档生成器的输入契约，W1 第一件事）
- [ ] Firecrawl vs Jina：先用 Jina 免费层验证，量起来再上 Firecrawl？
- [ ] 中文站点支持：Tavily 中文搜索质量需验证，可能要加 Bocha/博查 之类的中文搜索备选
