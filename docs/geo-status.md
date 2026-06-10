# GrowthHunt GEO — 阶段进展与思考

> 更新于 2026-05-21 · 状态：**Phase 1 已上线生产，Phase 2 设计中**

---

## 一、产品是什么

GrowthHunt 产品矩阵下的新模块。一句话：**帮 indie hacker 的页面在 AI 回答里被引用**——ChatGPT / Perplexity / Gemini / Claude 回答问题时会引用来源，GEO（Generative Engine Optimization）就是让你成为被引用的那一个。

与 ViralX 并列：ViralX 解决"被人看到"，GEO 解决"被 AI 看到"。

## 二、核心战略判断（这个产品最重要的几条思考）

**1. 审计 / skill 本身不指望直接赚钱——它是 GrowthHunt 的免费获客漏斗。**
调研结论：一次性 GEO 审计已经是 commodity——Auriti-Labs/geo-optimizer-skill（429★）、GeoKit、aaron-he-zhu 的 20-skill 包（1700★）全是免费开源。真正能收费的是「持续监控」那一层（GeoReady Pro、Ahrefs Brand Radar 收 $199–1148/月），但没有一家验证出收入，赛道才几个月。
→ 引擎做到"够用"即可，别在审计深度上跟竞品军备竞赛；重心放 `/geo` 网页漏斗和内容。GrowthHunt 的真实优势不是引擎，是**已有受众 + 能承接漏斗的矩阵产品**。

**2. 钱在 Phase 2/3 的「监控 + 内容 agent」，不在一次性审计。**

**3. skill 自包含、不绑 API（用户决定）。** skill 自己抓页面、自己跑规则，不调 GrowthHunt 的 API。代价是 skill 不导流；漏斗压在 `/geo` 网页和内容上。skill 定位为慷慨的开源工具 / 品牌资产。

**4. 内容 agent「踩刹车」——人审、不自动发。** 全自动量产 GEO 文章正是 AI 内容垃圾，有反噬风险。Agent 找内容缺口 → 起草 → 人审 → 发。

**5. 分三阶段，每步都不浪费。** Phase 1 = 地基 + 漏斗；Phase 2 = 在自己身上验证 agent；Phase 3 = 包成付费产品。

## 三、竞品格局（调研结论）

| 产品 | 形态 | 备注 |
|---|---|---|
| Auriti-Labs/geo-optimizer-skill（429★）| skill+CLI+MCP+web 全塞一个 repo | 臃肿；做成 GeoReady.dev，付费档全是 waitlist，零验证收入 |
| aaron-he-zhu/seo-geo-claude-skills（1700★）| 20 个 SEO/GEO skill 打包 | 纯免费，靠分发覆盖面 |
| GeoKit（11★）| npm CLI | 基本没人用 |
| Otterly / Profound / Ahrefs Brand Radar | 企业向监控 SaaS | "结果测量"（被没被引用），非 per-page 审计；$199–1148/月 |

共同规律：**skill / CLI 永远是免费引流品，钱（如果有）在 recurring 监控层。**

## 四、Phase 1 — 已交付（2026-05-21 上线生产）

**审计引擎** `lib/audit/`
- `fetch.ts` 抓取（fetch + cheerio，不跑 JS，含 SPA 检测）
- 8 个维度 `dimensions/`，~45 检查项，权重合计 100
- `gating.ts` 3 个一票否决项（AI 爬虫全屏蔽 / noindex / 无法分析）
- 可插拔维度注册表 `registry.ts` + `RUBRIC_VERSION`（维度可迭代、评分版本化）
- `llm.ts` 用 MiniMax 评 First Answer 维度 + 汇总问题；失败有启发式兜底

8 维度权重：Crawler Access 13 · Indexability & Discovery 12 · Structure 15 · Schema 12 · Factual Density 13 · Entity Clarity 10 · Freshness 10 · First Answer 15

**API**：`app/api/audit`（24h 缓存 + IP/邮箱限流）、`app/api/geo/share`

**`/geo` 网页**：8 段式落地页（沿用站点 Editorial 设计系统）——URL 审计表单 + 雷达图 + 检查清单 + 优先修复 + **Markdown 报告导出** + 分享页。UI 全英文。已注册进首页产品矩阵（展示名 **GEO Score**）。

**Skill**：`JoyyyceD/geo-skill`（public）——**自包含**，`SKILL.md` + 可执行评分 rubric + 中英双语 README + MIT。安装 `npx skills add JoyyyceD/geo-skill`。

**Supabase**：4 张 `geo_` 表已建（`geo_audits` / `geo_usage` / `geo_subscribers` / `geo_shares`，RLS 启用）。

**质量**：22 个单元测试，build / typecheck 通过，引擎对真实 URL 验证可用。

## 五、架构与技术栈

一套审计逻辑、多个壳：核心逻辑只写一份（`lib/audit/`），`/geo` 网页调它的 API；skill 自己内置同一套规则（自包含，不调 API）。
- Next.js 16 + React 19 + Tailwind 4，Vercel 部署
- Supabase（项目 `xehgrzpbhhevodxflzwg`）
- LLM：MiniMax（`minimaxChat`，复用 ViralX 的封装；已卸载 `@anthropic-ai/sdk`）

## 六、Phase 2 — 监控 + 内容 agent

**它不是一个面向客户的"产品形态"，是一条内部流水线**——先 dogfood 跑 GrowthHunt 自己的站。一个每周自动跑的循环：

1. **监控** — weekly cron（复用 ViralX 的 cron）重新审计登记的页面，分数存历史、检测 regression。
2. **引用追踪**（可选 / 待定）— 拿 query 集真去 AI 引擎查有没有被引用。最真实的"结果信号"，也最贵最麻烦。
3. **内容缺口 → 起草 agent** — 找缺口、起草 GEO 文章，作为 **draft PR** 提到 repo。
4. **周报邮件**（复用 brevo）。

dogfood 阶段**几乎没有 UI**——界面就是「周报邮件 + GitHub draft PR」，审核闭环 = `git merge`。这是故意的，省掉整套审核 UI。

**待拍板**：引用追踪是否进 Phase 2。建议先不做（先把"重审 + 内容起草"跑顺），留作 Phase 2.5 / Phase 3 的核心卖点。

## 七、Phase 3 — 付费产品

把 Phase 2 那台机器包成**托管的「监控 + 内容」仪表盘**：分数时间曲线、内容缺口清单、草稿审核队列 + 账号 + 订阅计费，约 $19–49/月（GeoReady Pro / Ahrefs Brand Radar 那个形状）。**仅当 Phase 2 的草稿质量验证过关才做。**

## 八、关键决定记录（均为 2026-05-21）

- 引擎"够用"即可，重心放漏斗和内容——不跟竞品拼审计深度。
- 维度做成可插拔 + 评分版本化（`RUBRIC_VERSION`）——先上 8 个，靠 dogfood 数据迭代，不靠抄竞品。
- LLM 改用 MiniMax（key 项目已配），弃用 Anthropic。
- skill 改为**自包含**——否决了"保留 API 依赖做漏斗"的方案；漏斗只靠 `/geo` 网页。
- 营销文案不点名具体引擎（用 "AI answers"），引擎名只留在功能位（兼容性评级、爬虫名）；"Claude Code" 泛化为 "your AI editor"。
- skill 公开仓库放个人账号 `JoyyyceD/geo-skill`，不放 `GrowthHunt` org。

## 九、待办 / 风险

- 生产环境 `MINIMAX_API_KEY` 需确认有效——本地 `.env.local` 是占位符；key 无效则 First Answer 走启发式兜底（审计不崩，只是少一层）。
- SPA 盲区是头号准确性风险——已有显式检测 + 诚实输出（不给误导性低分）。
- skill 与 `skills/geo-audit/`（source of truth）需手动镜像；可考虑做个同步脚本。
- 旧 geo-mvp 遗留 ~20 张空表（RLS 关闭）保留不动。

## 十、关键信息

- 代码仓库：`JoyyyceD/GrowthHunt`（私有，分支 `main` + `dev`）
- Skill 仓库：`JoyyyceD/geo-skill`（public）
- 网页：`growthhunt.ai/geo`
- Supabase 项目：`xehgrzpbhhevodxflzwg`（"JoyyyceD's Project"）
- 本地：`/Users/joycedong/dev/GrowthHunt2.0`，`npm run dev` → localhost:3000
