// One-shot SEO frontmatter rewrite for ZH growth-stories.
// Same logic as the EN script — only touches `title` and `description` in
// each index.zh.mdx; body stays byte-identical.

import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('content/growth-stories')

const updates = {
  anthropic: {
    title: 'Anthropic 增长故事：5 年做到 300 亿美金 ARR 的完整复盘',
    description: '七位 OpenAI 研究员出走五年后做出 300 亿美金 ARR 的公司——把「安全」做成反向定位，配上 AI 行业最精准的捆绑式融资节奏。',
  },
  'character-ai': {
    title: 'Character.AI 增长故事：从 10 亿美金独角兽到 27 亿反向收购',
    description: '32 个月从 10 亿美金独角兽到 27 亿反向收购。消费 AI 从未有人复制的参与度，永远没追上的变现，和一个无先例的交易结构。',
  },
  cursor: {
    title: 'Cursor 增长故事：13 个月做到 10 亿美金 ARR 的完整拆解',
    description: '24 个月从 VS Code 分支到 293 亿估值。但前 22 个月几乎停滞——曲线垂直向上是在 2024 年 10 月之后。这就是为什么。',
  },
  elevenlabs: {
    title: 'ElevenLabs 增长故事：46 个月做到 110 亿美金的语音 AI',
    description: '46 个月从伦敦公寓里的秘密押注到 110 亿美金语音 AI 平台。两场丑闻、三代模型、四次捆绑融资——每一步都在压缩曲线。',
  },
  gamma: {
    title: 'Gamma 增长故事：接入 GPT 后 3 个月用户从 6 万涨到 300 万',
    description: '2.5 年前 AI 时代毫无起色，2023 年 3 月接入 GPT 后用户 3 个月从 6 万涨到 300 万——团队保持精简，每轮融资后依然盈利。',
  },
  genspark: {
    title: 'Genspark 增长故事：弃 500 万用户转型、11 个月做到 2 亿 ARR',
    description: 'Day 0 是 6000 万美金种子轮和 TechCrunch 头条。9 个月后放弃 500 万用户。再过 11 个月 ARR 突破 2 亿。最干净的强制转型案例。',
  },
  'hugging-face': {
    title: 'Hugging Face 增长故事：怎么变成 AI 界的 GitHub',
    description: '从一款失败的青少年聊天机器人到 AI 界的 GitHub。7.5 年学术社区底层复利，加上 AI 赛道最分散的战略投资人阵容。',
  },
  humane: {
    title: 'Humane AI Pin 失败复盘：2.3 亿美金的产品翻车故事',
    description: '两位 ex-Apple 创始人、2.3 亿美金、五年潜行、TED 舞台——以及一次基础设施无法吸收的发布。AI 硬件失败的标准案例。',
  },
  jasper: {
    title: 'Jasper 失败复盘：15 亿融资如何被 ChatGPT 一击毙命',
    description: '从 15 亿美金 A 轮到 ChatGPT 出现，43 天。教科书级 GTM 救不了 GPT-3 套壳护城河。最干净的 AI 应用 D1 失败记录。',
  },
  linear: {
    title: 'Linear 增长故事：花 3.5 万美金营销做到 1 亿美金 ARR',
    description: '六年反 Jira 反向定位、累计付费营销仅 3.5 万美金、1.34 亿融资对应 1 亿美金 ARR——B2B SaaS 最干净的设计驱动 + 资本效率案例。',
  },
  lovable: {
    title: 'Lovable 增长故事：15 个月做到 4 亿美金 ARR 的增长打法',
    description: '从 50K 星开源项目和两次失败商业化，到 15 个月做到 4 亿美金 ARR。预先搭好的受众群在品牌对了的那一刻引爆。',
  },
  manus: {
    title: 'Manus 增长故事：一段 demo 引爆 200 万候补、9 个月 1 亿 ARR',
    description: '2025 年 3 月 6 日一段 2 分钟 demo 让 200 万人涌入候补。9 个月后 1 亿美金 ARR + 20 亿 Meta 收购案。然后被中国叫停。这几乎不是运气。',
  },
  notion: {
    title: 'Notion 增长故事：13 年的论点和那场 AI 定价押注',
    description: '六年前 PMF 漂流期建立在 13 年稳定的论点之上，AI 作为功能而非转型上线。2025 年 5 月的定价调整暴露了这场赌注的边界。',
  },
  oura: {
    title: 'Oura Ring 增长故事：13 年从众筹戒指到 110 亿健康平台',
    description: '13 年从奥卢一个 Kickstarter 戒指到 110 亿美金健康平台。前 7 年悄无声息，NBA 泡泡翻转品牌，订阅制修复商业模型。',
  },
  plaude: {
    title: 'PLAUD AI 增长故事：零融资 27 个月做到 2.5 亿美金 ARR',
    description: '从 5000 美金众筹目标到 2.5 亿美金 ARR 历时 27 个月——零机构融资、硬件优先、刻意保持精简。消费级 AI 硬件真正奏效时的样本。',
  },
  replit: {
    title: 'Replit 增长故事：13 个月 ARR 从 1000 万跃升到 2.53 亿',
    description: '8 年平台底层基建、一次默认死亡、然后是案例库里最干净的一次 D1 转折。Replit Agent 上线后 ARR 13 个月从 1000 万跃升到 2.53 亿。',
  },
  vercel: {
    title: 'Vercel 增长故事：93 亿美金估值背后的 8 年增长复盘',
    description: '8 年免费框架、6 轮融资、93 亿美金估值。Vercel 是 A1（承重底层）+ D1（技术叙事升维）十年叠加打法最干净的案例。',
  },
  clay: {
    title: 'Clay 增长故事：转型 42 个月做到 1 亿美金 ARR',
    description: '从 8 年缓慢增长到 2022 年 1 月转型后 42 个月做到 1 亿美金 ARR。最干净的 compound stacking 案例：可复用模板 + 创作者生态 + 双创始人每日在场。',
  },
  lemlist: {
    title: 'Lemlist 增长故事：零 VC 自举 7 年做到 4500 万美金 ARR',
    description: '七年欧洲自举、零 VC、在饱和冷邮件赛道做到 4500 万美金 ARR。一位创始人的日更内容做成 GTM 引擎——现代 B2B SaaS 最响亮的 B2 + C3 叠加打法。',
  },
  posthog: {
    title: 'PostHog 增长故事：开源 + 公开 Handbook 做到 14 亿估值',
    description: 'YC W20 期间 6 个月转向 5 次，4 周写完 MIT 协议 MVP，6 年公开整个公司内部。Handbook 就是 demo，透明就是护城河——5000 万 ARR、14 亿估值。',
  },
}

let changed = 0
for (const [slug, fields] of Object.entries(updates)) {
  const filePath = path.join(root, slug, 'index.zh.mdx')
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIP missing: ${filePath}`)
    continue
  }
  const original = fs.readFileSync(filePath, 'utf8')
  const fmEnd = original.indexOf('\n---', 4)
  if (!original.startsWith('---\n') || fmEnd === -1) {
    console.warn(`SKIP no frontmatter: ${filePath}`)
    continue
  }
  const frontmatter = original.slice(0, fmEnd)
  const body = original.slice(fmEnd)
  const escape = (s) => s.replace(/"/g, '\\"')
  const newFm = frontmatter
    .replace(/^title:\s*".*"\s*$/m, `title: "${escape(fields.title)}"`)
    .replace(/^description:\s*".*"\s*$/m, `description: "${escape(fields.description)}"`)
  if (newFm === frontmatter) {
    console.warn(`SKIP no change: ${slug}`)
    continue
  }
  fs.writeFileSync(filePath, newFm + body)
  console.log(`updated zh: ${slug}`)
  changed++
}
console.log(`\n${changed}/${Object.keys(updates).length} ZH files updated.`)
