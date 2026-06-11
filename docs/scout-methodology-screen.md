# Scout 方法论弹药库盘点（Methodology Screen）

> 2026-06-11 · 批次 D 配套。盘点可用的 34 个营销方法论 playbook，按"对 Scout 的价值"分层。
> 已注入 ✅ = 方法论已提炼进 prompt；每项标注建议的落点与优先级。

## 第一层：已注入（批次 D1 完成）

| 方法论 | 注入位置 | 注入了什么 |
|---|---|---|
| social-content ✅ | draft_posts、first-week-calendar、social-strategy | hook 公式族（curiosity/story/value/contrarian）、内容支柱 % 框架（promo ≤10%）、平台分发规则（正文不放外链）、30 分钟互动日课、队列卫生 |
| copywriting ✅ | SHARED_RULES（全部文档）、calendar CTA | 文案铁律（简单词/主动语态/零感叹号/收益>功能/具体>模糊）、CTA 公式（动词+所得）+ 弱 CTA 黑名单 |

## 第二层：高价值，建议下一轮注入（强化现有 7 份文档）

| 方法论 | 落点 | 能补什么 | 优先级 |
|---|---|---|---|
| **customer-research** | audience-persona 生成器 | JTBD 框架、voice-of-customer 挖掘法（评论/Reddit/G2 的"数字水源地"）、persona 的 buying-trigger 结构——persona 文档会从"合理想象"升级为"有方法论支撑的推断" | ⭐⭐⭐ |
| **competitor-alternatives** | competitor-deep-dive 生成器 | vs 页/alternative 页的四种框架、battle-card 结构、"诚实承认对手强项"的信任写法 | ⭐⭐⭐ |
| **marketing-psychology** | draft_posts + brand-guidelines | 锚定/社会证明/损失厌恶/框架效应的合规用法清单——给"禁用虚假紧迫感"提供正向替代 | ⭐⭐ |
| **content-strategy** | social-strategy 生成器 | topic cluster、内容支柱与业务目标的映射法 | ⭐⭐ |
| **copy-editing** | 新增：文档生成后的自动 QA pass | 逐行打磨清单（被动语态/赘词/jargon 扫描）——可做成生成器的第二遍自检 | ⭐⭐ |

## 第三层：新能力候选（V2.5/V3 的 Scout 新工具，按用户高频需求排序）

| 方法论 | 形态 | 触发场景 | 备注 |
|---|---|---|---|
| **launch-strategy** | Scout playbook 工具 | "帮我策划 Product Hunt 发布" | 与 Growth Story 案例引擎天然联动（真实 launch 先例）；对口我们自己的公开 launch |
| **cold-email** | 工具（接现有 lib/agents/cold-email） | "帮我写触达 X 类客户的冷邮件序列" | 旧 agent 升级注入方法论后迁入 Scout |
| **email-sequence** | 工具 | "给注册用户写 onboarding 邮件流" | 需要邮件发送基建（v2.5 晨报邮件时顺路） |
| **lead-magnets** | docgen 第 8 份文档候选 | onboarding 可选产出"lead magnet 策划案" | 轻量，价值清晰 |
| **ai-seo / seo-audit / schema-markup** | 工具组 | "我的站点为什么不被 AI 引用" | 与现有 /geo 工具合流的机会 |
| **pricing-strategy** | 对话能力（无需新工具） | "我该怎么定价" | 注入 system prompt 的知识引用即可 |
| **marketing-ideas** | 晨报弹药 | 心跳生成"今天值得试的 1 个增长点子" | 留给阶段 2 心跳 |

## 第四层：服务 GrowthHunt 自身增长（不是 Scout 功能，是我们自己的运营）

| 方法论 | 用在哪 |
|---|---|
| launch-strategy | Scout 公开 launch 的策划（PH + build in public） |
| referral-program | 分享报告页之后的下一层病毒机制设计 |
| paywall-upgrade-cro / pricing-strategy | 阶段 5 计费的免费→付费转化设计 |
| onboarding-cro / signup-flow-cro | /scout hero → 完成 onboarding 的漏斗优化 |
| page-cro | 首页 Scout 入口区块的转化迭代 |
| analytics-tracking | 内测期埋点方案（分享率/approve 率/留存） |

## 第五层：暂不相关

ad-creative、paid-ads（无广告预算阶段）、form-cro、popup-cro、churn-prevention（无订阅用户）、revops、sales-enablement（无销售团队）、free-tool-strategy（GrowthHunt 本身已是工具矩阵）、programmatic-seo（D5 伏笔已留，等分享页数据）、customer-research 的访谈部分（无用户访谈可分析）、site-architecture、product-marketing-context、ab-test-setup（留给有流量后）。

## 建议的注入节奏

```
D2（本轮）   评分报告出来后，按短板针对性注入第二层（预计 customer-research
             和 competitor-alternatives 命中 persona/competitor 两份文档的弱项）
心跳阶段     marketing-ideas + content-strategy 进晨报生成
v2.5         launch-strategy/cold-email 成为 Scout 新工具（前 2 个新能力）
计费阶段     第四层的 pricing/paywall 方法论用于我们自己
```

核心原则不变：**方法论是 prompt 资产不是依赖**——每次注入都是"读 playbook → 提炼 5-8 条铁律/框架 → 写进对应 prompt → 评分验证"，不引入任何运行时代码。
