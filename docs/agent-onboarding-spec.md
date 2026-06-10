# Onboarding Pipeline 详细规格（批次 2 工作稿）

> 配套：[agent-decision-log.md](./agent-decision-log.md) · 全英文产品（批次 1 已定）· Persona = Scout

---

## 1. 六份文档逐份 Outline

通用要求：直接可用（不是模板不是建议）、具体到名字/数字/渠道、所有市场数据带来源、禁止 AI 腔（"In today's fast-paced world..."）。

### 1.1 business-profile.md（600–900 词）
1. **One-liner 标题**：`{Product}: The {differentiator} {category}`
2. **What They Do**：2 段。产品做什么 + 消除了什么 friction
3. **Core Market**：主受众（年龄段+角色+动机），用一个具名例子落地；次级人群一段
4. **Why Now**：3–4 个加粗驱动力（人口/技术/文化/品类验证），每个 1–2 句带数据
5. **Monetization**：定价模型 + 具体价格（从网站抓，抓不到标 "pricing not public"）
6. **Growth Signals**：用户量/评分/覆盖国家等可验证信号
7. **Competitive Moat**：1–2 段，说清为什么难抄

### 1.2 brand-guidelines.md
1. **Voice Sliders 表**：5 维（Formality / Playfulness / Authority / Detail / Emotional Resonance），每维 X/10 + 一句 "What It Means"
2. **Color Palette 表**：5 色（hex / role / usage），来自抓取的真实色板
3. **Sample Messaging**：6–8 条符合该品牌口吻的示例句（可直接用于广告/帖子）
4. **Tone Guardrails**：1 段，写"这个品牌的语气底线"
5. **Forbidden Phrases**：≥6 条禁用词/禁用模式（buzzword、虚假紧迫感、品类俗套——按行业定制，这是 taste 的集中体现）

### 1.3 audience-persona.md
1. **Primary Persona**（具名！如 "Sarah Chang, 48, CFO"）：基本面（角色/收入/技术熟练度）、Goals ×4、Pains ×5、Motivations ×3、**Channels**（平台 + 使用频率 + 行为方式）、**Buying Signals**（3 条"她会因为什么找到你"）
2. **Secondary Persona**：简版（一段身份 + 一句 JTBD 引语 + 关键差异）

### 1.4 social-strategy.md
1. **Channel Priorities**：4 渠道排序 + 各一句理由；**渠道池必须考虑 Reddit**（适配时给到 subreddit 级建议——差异化点 6.3）
2. **Channel Strategy 表**：渠道 / 受众 / 内容形式 / 频率 / 语气
3. **Content Pillar Rotation**：每渠道的支柱轮换（周几发什么类型）
4. **Engagement Rules**：响应时效、首次回复哲学（先好奇后推销）、story-first 原则、testimonial 收集流程
5. **Playbook Precedent**（差异化点 6.1）：引用 1–2 个最匹配的 Growth Story 案例："{Company} grew the same audience via {channel} — here's what applies to you"，附 growth-story 链接

### 1.5 first-week-calendar.md
- 7 行表：Day / Channel / **Hook Type**（Pain, Story, Data, Contrarian, Tease, Win, Question 各一）/ Body（完整可发文案，遵守 brand-guidelines）/ CTA
- 文案长度按渠道适配（X ≤280 字符、LinkedIn 中长、FB 中等）；渠道分配遵循 1.4 的优先级（含 Reddit 时给出目标 subreddit）
- 表后一段 **Modeled on**：注明日历节奏参考了哪个真实案例的首周打法（6.1）

### 1.6 competitor-deep-dive.md
1. **Primary Competitor**：最强对手的 What They Do Well（诚实评价，2–3 段）
2. **Gaps in Their Approach**：3 个具体摩擦点（语言/时间线/渠道等，按实际情况）
3. **Differentiation Strategy**：3–4 个差异化主张，落点是"服务不同的人群/时刻"而不是"做更好的 X"；收尾一句定位金句

### 1.7 market-research.md
1. **Market Size & Tailwinds**：3 个带来源的数据点（TAM/增速/搜索趋势）
2. **Competitive Set 表**：4–6 家（产品 / 形式 / 定价 / vs 我们的关键差异 / 适合谁）——比 1.6 广而浅，1.6 只深挖最强的一家
3. **Audience Insights**：3–4 个带数据的行为洞察（社区规模、季节性峰值、决策人群代际）

## 2. BrandIntelligence Schema（生成器的输入契约）

```typescript
interface BrandIntelligence {
  product: {
    name: string; url: string; tagline?: string;
    oneLiner: string;               // 综合得出，≤25 词
    category: string;               // "voice-first memoir platform"
    features: string[];             // 5-10 条
    pricing?: { model: 'one-time'|'subscription'|'freemium'|'unknown';
                tiers: { name: string; price: string; includes: string }[] };
  };
  brand: {
    logoUrl?: string;
    palette: { hex: string; role: 'primary-bg'|'cta'|'accent'|'text'|'tertiary' }[];
    toneWords: string[];            // 从站点文案观察到的语气词
    sloganCandidates: string[];     // 站点上的口号原文
    voiceObservations: string[];    // "short sentences, em-dashes, no exclamation marks"
  };
  audience: {
    segments: { name: string; ageRange?: string; role: string; jtbd: string;
                pains: string[]; channels: string[]; buyingSignals: string[] }[];
  };
  market: {
    whyNow: { driver: string; evidence: string }[];
    dataPoints: { claim: string; source: string; url?: string; year?: string }[];
  };
  competitors: { name: string; url?: string; format: string; pricing?: string;
                 strengths: string[]; gaps: string[]; vsUs: string }[];
  confidence: {
    scrape: number;                 // 0-1，低于 0.4 触发兜底
    search: number;
    notes: string[];                // "pricing page was JS-rendered, used cached copy"
  };
}
```

- 由「综合」步骤一次性产出（Claude Sonnet，输入 = 抓取的 markdown ×3 页 + Tavily 结果 ×4 组）
- 入库存 `agent_tasks.result`（jsonb），供重新生成单份文档时复用（不必重抓）

## 3. Scout 旁白脚本（状态机 → 对话流文案）

| 状态 | Scout 说（英文，第一人称） |
|---|---|
| 开场 | "I'm Scout, your AI growth teammate. Give me about 30 seconds — I'll scan your site and your market, then build the brand playbook everything I write for you will stand on. 🐾" |
| scraping | "Reading your homepage and product pages…" → 完成后给一句**有信息量的反馈**："Got it. {oneLiner 复述 + 一个具体观察，如品牌色/口号}" |
| researching | "Now scoping your market and competitors…" → 完成后："Found your spot in the landscape — your sharpest edge vs {top competitor} is {X}." |
| synthesizing | "Locking in your brand identity…" |
| drafting | 每份文档开始时一句话预告（"Writing your brand guidelines — including what you should *never* say…"），完成即弹卡片 |
| done | 3–4 句总结：市场判断 + 最大机会 + "Your first week of posts is ready to ship." 🐾 |

原则：旁白不是进度条文案，每条都要**夹带一个真实发现**，让用户感到"它真的在看我的东西"。

## 4. 失败兜底

| 故障 | 触发条件 | 表现 |
|---|---|---|
| 抓站失败/内容过薄 | confidence.scrape < 0.4 或正文 < 500 字符 | Scout 转提问模式（不是表单）："Your site's playing hard to get. Tell me three things instead: what you sell, who it's for, and what makes it different." 逐条对话收集 → 走同一 pipeline |
| 搜索失败 | Tavily 异常/空结果 | 跳过 competitor-research，其余 5 份照常；Scout 明示："I couldn't verify market data right now — I'll draft the competitor brief once search is back." 不编造数据 |
| 单文档生成失败 | LLM 错误/超时 | 该卡片显示 retry 按钮，其余文档不受影响（并行隔离） |
| 整体超时 | 任务 > 5 分钟 | 已完成的文档保留入库，未完成的标记可重试 |

## 5. 质量验收标准

**评分维度**（每份文档 1–5 分，内测期人工评）：
1. **Factual**：无编造（价格/数据/竞品信息可溯源）
2. **Specific**：有名字、数字、渠道；删掉品牌名后仍能认出是谁的文档
3. **Voice-true**：语气符合该品牌实际站点观感
4. **Actionable**：first-week-calendar 的帖子敢直接发；禁用词清单针对该行业而非通用
5. **Format**：结构符合本 spec 的 outline

**通过线**：平均 ≥4 且无单项 ≤2。10 个 URL 全过才算 W3 验收通过。

**测试 URL 集**（10 个，覆盖不同行业/站点形态，含 2 个 JS 重渲染站考验抓取）：
1. devtool（如 resend.com）2. B2B SaaS（如 cal.com）3. 消费 App（如 flighty.com）
4. AI 工具（如 jenni.ai）5. 电商 DTC（如 graza.co）6. newsletter/媒体（如 lennysnewsletter.com）
7. fintech（如 mercury.com）8. 健康（如 eightsleep.com）9. marketplace（如 fern.com 或同类）
10. **GrowthHunt 自己**（吃自己的狗粮，也是 demo 素材）

> 待定：名单可换，原则是行业分散 + 大小站混合 + 至少 2 个内容很薄的小站（考验兜底）。

## 6. 本批次待确认项

- [ ] 6.1 first-week-calendar 是否同时写入 `gtm_scheduled_posts`（status=proposed）？——让"首周帖子"直接出现在队列里，一键 approve 即排期，打通 onboarding → 发布的链路（v1 就能体验闭环的雏形）
- [ ] 6.2 市场数据的引用严格度：每条数据强制带来源链接（更可信、生成更慢更难）vs 带来源名即可（Ollie 模式）
- [ ] 6.3 Assets 提前进 v1 后：是否包含「生成配图」（接图片生成 API），还是 v1 仅上传+引用？
