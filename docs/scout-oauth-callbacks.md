# Scout 社交平台连接配置手册（完整版）

> 代码层（OAuth 流 / Integrations 页 / 发布 cron / token 刷新）全部就绪。
> 剩余工作 = 在三个平台各注册一个开发者应用 → 凭据进环境变量 → 回调 URL 登记。
> 预计总耗时：Reddit 5 分钟 · X 10 分钟 · LinkedIn 15 分钟（+审核等待）。

## 通用说明

- 回调 URL 每个平台要登记**两个**（本地开发 + 生产）：
  - 本地：`http://localhost:3000/api/connect/{platform}/callback`
  - 生产：`https://www.growthhunt.ai/api/connect/{platform}/callback`
- 凭据放两处：本地 `.env.local` + Vercel Environment Variables（都要）
- 变量名以代码为准（`lib/social/types.ts`）：

```
X_OAUTH_CLIENT_ID=        X_OAUTH_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=       LINKEDIN_CLIENT_SECRET=
REDDIT_CLIENT_ID=         REDDIT_CLIENT_SECRET=
```

## 1. Reddit（最简单，先做这个）

1. 登录你的 Reddit 账号 → https://www.reddit.com/prefs/apps → 底部 "create another app"
2. 类型选 **web app**；name 填 `Scout by GrowthHunt`
3. redirect uri 填本地回调（Reddit 只允许一个 → 开发期填 localhost，上线前改成生产 URL；或注册两个 app 分别用于 dev/prod）
4. 创建后：应用名下方的一串字符 = `REDDIT_CLIENT_ID`，"secret" = `REDDIT_CLIENT_SECRET`
5. 无需审核，立即可用。scope（代码已声明）：`submit identity`

## 2. X / Twitter

1. https://developer.x.com → 登录发帖用的 X 账号 → 创建 Project + App（Free 档即可：写权限免费，读指标才要付费）
2. App settings → **User authentication settings** → Set up：
   - App permissions: **Read and write**
   - Type of App: **Web App**
   - Callback URI: 登记本地 + 生产两个
   - Website URL: `https://www.growthhunt.ai`
3. 保存后拿到 **OAuth 2.0 Client ID / Client Secret** → `X_OAUTH_CLIENT_ID/SECRET`
4. scope（代码已声明）：`tweet.read tweet.write users.read offline.access`
5. 备注：另有 BYO key 模式（用户填自己的 API key），与此并行存在，不冲突

## 3. LinkedIn（有一步轻审核）

1. https://www.linkedin.com/developers → Create app（需要关联一个 LinkedIn 公司主页——用 GrowthHunt 的；没有就先建一个，2 分钟）
2. App → **Products** 页：申请 **"Share on LinkedIn"** 和 **"Sign In with LinkedIn using OpenID Connect"**（这两个通常自动/快速通过；不要申请 Community Management API，那个审核很重且不需要）
3. **Auth** 页：Authorized redirect URLs 登记本地 + 生产两个；拿 Client ID / Client Secret
4. scope（代码已声明）：`openid profile w_member_social`

## 4. 配完后的验收路径

1. 凭据进 `.env.local` → 重启 dev server → `/scout/{ws}/integrations` 点 Connect → 平台授权页 → 跳回显示 "Connected! ● @你的handle"
2. 队列里 approve 一条对应平台的帖子 → 等 cron（5 分钟一跳）→ Activity 页出现 "● published" + "View post ↗" 能打开真帖
3. 生产同样流程（先把凭据加进 Vercel 并 Redeploy）

## 5. 容易踩的坑

- **redirect_uri mismatch**：回调 URL 必须和登记的完全一致（http/https、www、结尾斜杠都算）
- LinkedIn 的 w_member_social 只允许发**你自己**的动态（个人 account）；发公司主页需要额外产品权限，v2 先不做
- X Free 档有发帖频率上限（约 500 条/月/app），内测够用，规模化后升 Basic
- Reddit 发帖的 subreddit 必须是该账号有发帖权限的社区；karma 太低的新号在很多 sub 会被自动拒——用你的常用账号
