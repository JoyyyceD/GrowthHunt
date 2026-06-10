# Scout v1 工程任务拆解（W1–W3）

> 所有决策已冻结，见 [agent-decision-log.md](./agent-decision-log.md)。本文档是开工执行清单。
> 粒度：到文件/表/路由。每个任务带验收标准（AC）。

---

## W1：数据层 + Pipeline 核心（先跑通"URL → 2 份文档"）

### T1. 数据库迁移
- 新表 `agent_artifacts`、`agent_artifact_revisions`（结构见 architecture §2.2）+ RLS（owner 经 workspace 关联）
- `agent_tasks` 表扩展（若现有 tasks 表不够）：`kind, status, progress jsonb, result jsonb`
- 用量打点表 `api_usage`：`workspace_id, provider, tokens_in/out, cost_usd, created_at`（为限额和将来 credits 铺路）
- **AC**：迁移可回滚；RLS 测试通过（他人 workspace 不可读）

### T2. Scout 专属 loop（全新，不动 lib/orchestrator/）
- `lib/scout/loop.ts`：精简 ReAct 循环——原生 Claude tool use（无 JSON 容错层）、MAX_STEPS=5、步骤落库、SSE 5 事件（text_delta/step/artifact_delta+done/post_drafts/ask_user）
- `lib/scout/tools.ts`：16 工具注册表（schema 用 Claude tools 格式）；`lib/scout/client.ts`：Anthropic SDK 封装（Sonnet 主循环 + Haiku 轻分类）+ prompt caching + 用量打点
- 现有模块仅 import：lib/agents/*、lib/workspace/store、lib/orchestrator/memory
- 环境变量：`ANTHROPIC_API_KEY`、`TAVILY_API_KEY`、`JINA_API_KEY`
- **铁律**：本任务及后续所有任务不修改 lib/orchestrator/、/gtm、垂直页的任何文件
- **AC**：/gtm 全量回归零差异（git diff 证明未触碰）；新 loop 单测过（工具调用、流式、错误重试、限额拒绝）

### T3. 研究层：抓取 + 搜索 + 综合
- `lib/agents/scrape.ts`：Jina Reader 客户端（`r.jina.ai/{url}`）+ 现有 page-fetch 兜底 + 关键子页发现（pricing/about 链接识别）
- `lib/agents/research.ts`：Tavily 客户端 + 4 组标准查询模板（竞品/alternatives/市场规模/趋势）
- `lib/agents/brand-intel.ts`：综合步骤 → `BrandIntelligence`（schema 见 onboarding-spec §2），含 confidence 评分
- **AC**：10 个测试 URL 中 ≥8 个产出 confidence.scrape ≥0.4 的结果；JS 站（测试集 #4/#8）抓取成功

### T4. 文档生成器框架 + 首批 2 份
- `lib/agents/docgen/index.ts`：生成器注册表，统一签名 `(intel: BrandIntelligence, workspace) → stream<md>`
- `docgen/business-profile.ts`、`docgen/brand-guidelines.ts`（outline 按 spec §1 验收）
- 每份顺产 200 词摘要（存 artifacts 表 summary 列——T1 补列）
- **AC**：2 份文档在 3 个测试 URL 上人工评分 ≥4

### T5. Artifact 存取层
- `lib/artifacts/store.ts`：create/update（rev+1 自动快照）/read/list/download
- 注册 4 个 artifact 工具进编排层工具表
- **AC**：对话中"make the guidelines stricter"→ Scout 读改写回 → rev=2，rev=1 可查

## W2：任务化 + 全部 UI

### T6. Onboarding 后台任务 + SSE
- `lib/orchestrator/onboarding-task.ts`：状态机（scraping→…→done），驱动 T3/T4，文档间并行
- `app/api/scout/onboard/route.ts`（POST → task_id）、`app/api/scout/tasks/[id]/route.ts`（GET SSE：status / artifact_delta / artifact_done）
- 旁白文案按 spec §3（每条夹带真实发现：旁白模板接收 intel 字段插值）
- 兜底：scrape confidence <0.4 → 任务暂停 + Scout 三问对话（spec §4）
- **AC**：全程 ≤90 秒（不含排队）；断线重连不丢进度；失败文档可单独重试

### T7. /scout 路由与工作台
- `app/scout/page.tsx`：全屏 hero（URL 输入 + 可选补充 + Scout 形象）
- `app/scout/[workspaceId]/layout.tsx`：三栏布局（决策 3.1）
- `app/api/scout/chat/route.ts`：fork 自 gtm/chat，挂 ClaudeProvider + 16 工具
- 中栏：对话流 + artifact 卡片组件（打字机 → 折叠 300px，Expand/Copy/Download）+ 过程行
- 右栏：Upcoming 队列 + 文件列表（onboarding 时逐份点亮）+ brand assets
- **AC**：hero 提交 → 三栏 → 旁白 → 7 卡片全程无刷新；移动端降级为单栏可用

### T8. 文件页 + Assets 页
- `app/scout/[workspaceId]/files/page.tsx`：列表 + 阅读视图 + Copy/Download + rev 历史
- `app/scout/[workspaceId]/assets/page.tsx`：上传（Supabase storage，5MB 限）+ 网格 + logo/色板展示
- logo 自动抓：favicon/og:image → storage；色板：从首页 CSS/截图提取主 5 色 → workspace.palette
- **AC**：上传图片在 draft_posts 生成时可被引用（meta 里带 asset 引用）

### T9. 队列轻操作
- 右栏队列项：点开全文 / 编辑文案 / approve（未连平台 → 跳 Integrations 引导）
- first-week-calendar 生成时同步写 `gtm_scheduled_posts`（status=proposed，时间按日历 Day1–7 顺延）
- 平台池含 Reddit（差异化 6.3）：日历分配到 Reddit 的帖子带 meta.subreddit，approve 时校验已连 Reddit
- **AC**：连上 X 测试号后 approve 一条 proposed → cron 实际发出；Reddit 同链路验证一条

### T14. 案例引擎（差异化 6.1，新增）
- `lib/agents/case-match.ts`：从 Growth Story 库（content/growth-stories）按品类/受众/渠道匹配 1–2 个案例，输出案例摘要 + 链接
- 注入 social-strategy / first-week-calendar 生成器 prompt；文档含 "Playbook precedent / Modeled on" 段
- **AC**：10 个测试 URL 中 ≥8 个匹配到合理案例（人工判定不牵强）；不匹配时优雅省略该段（不硬凑）

## W3：质量 + Persona + 内测就绪

### T10. 剩余 5 份生成器 + prompt 迭代
- audience-persona / social-strategy / first-week-calendar / competitor-deep-dive / market-research
- 10 URL 测试集全量回归，按 spec §5 评分表逐份打分迭代
- **AC**：10/10 URL 平均 ≥4 无单项 ≤2

### T11. Scout persona 全量
- 头像三态（待命/工作中/完成）；UI 文案表（~20 条核心场景，第一人称 + Hire 话术）
- 空状态全部 persona 化（队列空 = "Tell me what to post today"）
- **AC**：全站无"系统腔"文案残留（grep 检查 + 人工过一遍）

### T12. 限额与打点
- per-workspace 日限额 $3（api_usage 聚合，超限 Scout 礼貌拒绝并说明）
- onboarding 100k token 硬顶（超时保留已完成文档）
- **AC**：压测脚本连跑 onboarding 触发限额，行为符合预期

### T13. 内测发布
- /scout 不挂首页导航，内测链接直达；简单 invite gate（环境变量白名单或邀请码）
- 反馈入口（对话里 /feedback 或页脚表单）
- **AC**：3 个真实外部用户完整走通 onboarding → approve 帖子

---

## 依赖关系

```
T1 ──→ T4, T5
T2 ──→ T4, T6, T7
T3 ──→ T4, T6
T4+T5 ──→ T6 ──→ T7 ──→ T9
T7 ──→ T8
T10 依赖 T6 稳定；T11/T12/T13 收尾并行
```

## 开工前置（用户侧）

- [ ] 注册 console.anthropic.com，充值 $50 起，拿 ANTHROPIC_API_KEY
- [ ] 注册 tavily.com（免费档即可），拿 TAVILY_API_KEY
- [ ] 注册 jina.ai（免费档即可），拿 JINA_API_KEY
- [ ] 确认 10 个测试 URL 名单（spec §5 有草案，可直接确认）
- [ ] Scout 头像：先用占位 emoji 🐾 开发，W3 前定稿视觉
