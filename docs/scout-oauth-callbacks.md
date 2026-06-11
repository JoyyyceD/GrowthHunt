# Scout 生产环境 OAuth 回调配置清单

> 批次 B 交付物。三个平台的开发者后台需要登记生产回调 URL，否则生产环境点 Connect 会报 redirect_uri mismatch。
> 本地开发用 localhost 回调（若已配置过则不用动）。

## 要登记的回调 URL（生产）

| 平台 | 开发者后台 | 要填的 Redirect/Callback URL |
|---|---|---|
| X (Twitter) | developer.x.com → 你的 App → User authentication settings → Callback URI | `https://www.growthhunt.ai/api/connect/x/callback` |
| LinkedIn | linkedin.com/developers → 你的 App → Auth → Authorized redirect URLs | `https://www.growthhunt.ai/api/connect/linkedin/callback` |
| Reddit | reddit.com/prefs/apps → 你的 App → redirect uri | `https://www.growthhunt.ai/api/connect/reddit/callback` |

注意：域名以 Vercel 实际生效的为准（apex `growthhunt.ai` 会 307 到 `www.growthhunt.ai`，回调要登记 **www** 版本；如两者都能直达，建议两个都登记）。

## 同时确认 Vercel 环境变量里有各平台凭据

| 平台 | 环境变量 |
|---|---|
| X | `X_CLIENT_ID` `X_CLIENT_SECRET`（OAuth2）；BYO 模式另有用户级 key，不需要全局配置 |
| LinkedIn | `LINKEDIN_CLIENT_ID` `LINKEDIN_CLIENT_SECRET` |
| Reddit | `REDDIT_CLIENT_ID` `REDDIT_CLIENT_SECRET` |

（具体变量名以 `lib/social/types.ts` 的 `getPlatformCreds` 为准；如果本地 `.env.local` 里已有这三组，照搬到 Vercel 即可。）

## 权限范围（申请 App 时需要的 scopes）

- X: `tweet.read tweet.write users.read offline.access`
- LinkedIn: `openid profile w_member_social`
- Reddit: `submit identity`（脚本应用类型选 "web app"）
