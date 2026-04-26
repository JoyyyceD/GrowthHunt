export interface Feature {
  id: string
  name: string
  tag: 'Live' | 'Soon'
  module: string
  pitch: string
  hook: string
  summary: string
  problem: string
  solution: string
  example: { input: string; output: string }
}

export interface ModuleDef {
  id: string
  num: string
  title: string
  sub: string
}

export const MODULES: ModuleDef[] = [
  { id: 'research',     num: '01', title: 'Research',     sub: 'See what your buyers complain about. Verbatim.' },
  { id: 'discovery',    num: '02', title: 'Discovery',    sub: 'Find the creators your buyers already trust.' },
  { id: 'outreach',     num: '03', title: 'Outreach',     sub: 'Pitch them. At scale. Personalized.' },
  { id: 'manage',       num: '04', title: 'Manage',       sub: 'Pipeline, replies, patterns, brand memory.' },
  { id: 'distribution', num: '05', title: 'Distribution', sub: 'Already-shipping tools that send traffic today.' },
]

export const FEATURES: Feature[] = [
  // ── Live products ──
  {
    id: 'listingbott', name: 'ListingBott', tag: 'Live', module: 'distribution',
    pitch: 'Auto-submit your launch to 100+ directories overnight.',
    hook: 'Sleep through directory submission. Wake up indexed.',
    summary: 'A no-touch agent that fans your launch out across the web — directory listings, niche communities, SEO-feeding link farms — while you sleep.',
    problem: 'Manually submitting to directories takes 30–40 hours per launch. Most founders skip it, lose backlinks, and watch competitors out-rank them.',
    solution: 'Drop your URL. ListingBott handles forms, captchas, and follow-ups across 100+ directories — and reports what got accepted.',
    example: { input: 'https://yourapp.com', output: '93 / 104 directories submitted · 47 confirmed · 24 backlinks live' },
  },
  {
    id: 'microlaunch', name: 'MicroLaunch', tag: 'Live', module: 'distribution',
    pitch: 'A launch platform that actually ships traffic.',
    hook: 'Product Hunt for builders who hate vote brigading.',
    summary: 'A community-curated launch board where every post is real, every upvote is human, and every winner gets a permanent spotlight.',
    problem: 'Product Hunt is a popularity contest. New launches drown without a network. You need attention, not just a listing.',
    solution: 'A weekly cohort of micro-launches with editorial curation, real founder feedback, and direct distribution to a builder audience.',
    example: { input: 'Submit launch', output: 'Featured · 1,247 visitors · 38 signups · 12 founder DMs in 24h' },
  },
  {
    id: 'viral-sense', name: 'Viral Sense (Ins)', tag: 'Live', module: 'distribution',
    pitch: 'A taste-engine for what\'s about to pop on IG.',
    hook: 'Know which formats are hitting before they hit.',
    summary: 'Trend detection + format library for Instagram Reels. Surfaces formats with rising velocity in your niche.',
    problem: 'By the time a format trends, it\'s saturated.',
    solution: 'Velocity detection on Reel formats per niche. Get in 4–6 days early.',
    example: { input: 'Niche: fitness', output: '3 rising formats · avg velocity +340% w/w' },
  },
  {
    id: 'x-templates', name: 'X Viral Templates', tag: 'Live', module: 'distribution',
    pitch: '47 post templates that have actually gone viral.',
    hook: 'Steal the structure. Add your story.',
    summary: 'A library of X post structures with verified viral history. Fill-in-the-blank. Schedule. Post.',
    problem: 'Staring at the X compose box is the worst part of marketing.',
    solution: 'Pick a template. Fill it in. Schedule. Track which structure works for your account.',
    example: { input: 'Template: build-in-public Friday', output: 'Avg engagement 4.2× your baseline' },
  },
  {
    id: 'startup-lib', name: 'AI Startup Playbook Library', tag: 'Live', module: 'distribution',
    pitch: 'Every winning AI startup\'s GTM, archived.',
    hook: 'How they did it. In their words.',
    summary: 'Curated library of public-record GTM decisions from breakout AI startups — first 100 users, first $10k MRR, first viral moment.',
    problem: 'You\'re reinventing GTM. Cursor, Granola, Linear already figured most of it out.',
    solution: '300+ playbooks indexed by stage and tactic. Searchable. Source-linked.',
    example: { input: 'Stage: pre-PMF', output: '47 playbooks · top: "Cursor — first 1k users via HN comment threads"' },
  },

  // ── Research module ──
  {
    id: 'reddit-pain', name: 'Reddit Pain Mining', tag: 'Soon', module: 'research',
    pitch: 'Find every complaint in your category. Verbatim.',
    hook: 'Type a category. See what your buyers are actually mad about.',
    summary: 'Continuous extraction of pain language from Reddit threads — clustered by jobs-to-be-done, ranked by frequency, and exportable as ad copy.',
    problem: 'You\'re writing copy from imagination. Your customers are writing copy for you, on Reddit, every day. You just can\'t find it.',
    solution: 'Point the agent at a category. It tracks 200+ subreddits, extracts pain phrases, clusters them, and surfaces exact quotes you can lift into headlines.',
    example: { input: 'Category: time tracking SaaS', output: '"Toggl literally crashes if I look at it wrong" · 47 similar complaints · cluster: reliability' },
  },
  {
    id: 'reddit-monitor', name: 'Reddit Competitor Watch', tag: 'Soon', module: 'research',
    pitch: 'Real-time signal on competitor sentiment.',
    hook: 'Know the moment a competitor screws up.',
    summary: 'Always-on monitoring of competitor mentions — sentiment scored, classified by complaint type, alerts piped to Slack.',
    problem: 'Your rival just shipped a buggy update. By the time you hear, the angry users have moved on.',
    solution: 'Watch competitor names + product terms across Reddit. Negative spikes trigger alerts. Quote-mine the threads to find churnable users.',
    example: { input: 'Watch: "Calendly"', output: 'Spike detected · 23 negative mentions · top complaint: "pricing change" · sentiment: -0.61' },
  },
  {
    id: 'keyword-alert', name: 'Brand Keyword Alerts', tag: 'Soon', module: 'research',
    pitch: 'Get pinged the second someone says your name.',
    hook: 'Mentions, in real time, with context.',
    summary: 'Keyword tracker across Reddit, X, HackerNews, Substack comments — the moment someone mentions you, your category, or your competitor.',
    problem: 'Free tools (Google Alerts, Mention.com) are 6 hours late and miss 40% of social. You miss the conversation.',
    solution: 'Sub-minute latency. Includes thread context. One click to draft a reply.',
    example: { input: 'Alert: "GrowthHunt"', output: '@indiehacker_jen mentioned you on r/SaaS · 14 sec ago · positive · suggested reply ↗' },
  },
  {
    id: 'rival-creators', name: 'Rival Creator Reverse-Lookup', tag: 'Soon', module: 'research',
    pitch: 'Every creator your competitor has paid. Surfaced.',
    hook: 'See exactly who your competitor sponsored — and at what scale.',
    summary: 'Reverse-engineers a competitor\'s creator partnership graph from public sponsor disclosures, video descriptions, and link patterns.',
    problem: 'Competitor case studies brag about their creator deals. They never tell you which creators.',
    solution: 'Drop a competitor URL. We surface every YouTuber, Substack writer, and podcaster that promoted them — with audience overlap to your ICP.',
    example: { input: 'Competitor: superhuman.com', output: '47 creators identified · 12 high-fit for your ICP · est. CPM range $40–$120' },
  },
  {
    id: 'rival-haters', name: 'Rival Detractor Discovery', tag: 'Soon', module: 'research',
    pitch: 'Find creators who roasted your competitor.',
    hook: 'A haterbase is a warm lead list.',
    summary: 'Surfaces creators who have publicly criticized a competitor — i.e. people who already have a take, an audience, and a reason to switch.',
    problem: 'Cold creators are a cold market. Warm haters are a warm market. You just don\'t have a way to find them.',
    solution: 'We index the cranky takes. Sort by audience size. Pitch them your better alternative.',
    example: { input: 'Find detractors of: Notion', output: '34 creators · top hater: 180k subs · gripe: "performance hell"' },
  },

  // ── Discovery module ──
  {
    id: 'youtube-find', name: 'YouTube Creator Discovery', tag: 'Soon', module: 'discovery',
    pitch: 'Drop your URL. Get 10 perfect-fit YouTubers.',
    hook: 'Your URL → ten YouTubers your buyers already watch.',
    summary: 'Audience-overlap matching against 2.4M+ YouTube creators. Ranks by topical fit, audience demographic, and past sponsor performance.',
    problem: 'Manually browsing YouTube for creators in your niche is a 40-hour week of nothing.',
    solution: 'We score creators on relevance, reach, and likelihood-to-respond. You get a ranked outreach list.',
    example: { input: 'https://yourapp.com', output: '10 creators · avg fit score 0.81 · est. response rate 34%' },
  },
  {
    id: 'similar-creator', name: 'Similar Creator Expansion', tag: 'Soon', module: 'discovery',
    pitch: 'Find 50 more creators like the one that worked.',
    hook: 'One creator clicked. Find their 50 cousins.',
    summary: 'Lookalike search on creator embeddings — same niche, same audience, same energy.',
    problem: 'Your one good partnership is a fluke unless you can replicate it.',
    solution: 'Take a creator that converted. Surface 50 with overlapping audience. Outreach in batch.',
    example: { input: 'Seed: @marquesbrownlee', output: '52 lookalikes · top match: @mkbhd_devs (94% overlap)' },
  },
  {
    id: 'instagram-find', name: 'Instagram Creator Discovery', tag: 'Soon', module: 'discovery',
    pitch: 'Niche IG creators, scored on real engagement.',
    hook: 'Skip the bot accounts. Find real audiences.',
    summary: 'Real-engagement scoring filters out follower-bought accounts. Niche topical match over vanity metrics.',
    problem: 'Half of "100k follower" Instagram accounts are bot-pumped. You burn budget pitching ghosts.',
    solution: 'We score by genuine engagement velocity. Rank by ICP overlap. Surface 30 real creators.',
    example: { input: 'Niche: indoor plants', output: '28 creators · avg ER 4.2% (real) · 3 with paid promo experience' },
  },
  {
    id: 'tiktok-find', name: 'TikTok Creator Discovery', tag: 'Soon', module: 'discovery',
    pitch: 'TikTokers who match your category — fast.',
    hook: 'Find your TikTok partners before the trend dies.',
    summary: 'Same matching engine, tuned for TikTok\'s velocity. Filter by trend participation, audience age, and CPM band.',
    problem: 'TikTok trends die in 11 days. By the time you find a creator, the trend is over.',
    solution: 'Real-time creator surfacing tied to current trend signals. Match → pitch in under 24 hours.',
    example: { input: 'Niche: productivity tools', output: '19 creators · 4 currently riding "deep work" trend · pitch window: 8 days' },
  },
  {
    id: 'substack-find', name: 'Substack Author Discovery', tag: 'Soon', module: 'discovery',
    pitch: 'Newsletter authors who write about your category.',
    hook: 'High-trust audiences, low-noise channels.',
    summary: 'Indexes 800k+ Substacks. Ranks by category fit, paid subscriber estimate, and openness to sponsorship.',
    problem: 'Substack is a goldmine for niche audiences. There\'s no good way to search it.',
    solution: 'Topical matching across 800k newsletters. Surface authors. See their last sponsor placement and est. rate card.',
    example: { input: 'Topic: dev tools', output: '23 authors · est. paid subs: 220–14k · 11 with sponsor history' },
  },
  {
    id: 'podcast-find', name: 'Podcast Host Discovery', tag: 'Soon', module: 'discovery',
    pitch: 'Podcasts where your founder pitch belongs.',
    hook: 'Find the show. Get on the show.',
    summary: 'Topical match on podcast transcripts (not just titles). Surface shows that have actually discussed your space.',
    problem: 'Podcast title search returns 90% noise. Real fit lives in the transcript.',
    solution: 'We index transcripts. Match on conversation content. Surface 15 shows whose hosts already talk about your category.',
    example: { input: 'Topic: B2B SaaS pricing', output: '15 podcasts · avg downloads 12k–84k · 6 with founder-interview format' },
  },
  {
    id: 'twitter-find', name: 'X / Twitter KOL Discovery', tag: 'Soon', module: 'discovery',
    pitch: 'KOLs in your space, ranked by real signal.',
    hook: 'The X accounts your buyers actually quote-tweet.',
    summary: 'Build-in-public KOL discovery. Filter by topic, follower count, engagement velocity, and quote-tweet network.',
    problem: 'X is loud. Real buyers quote-tweet a small set of accounts. You don\'t know which ones.',
    solution: 'We map the quote-tweet graph. Surface the 20 accounts your category respects.',
    example: { input: 'Niche: AI tooling', output: '20 KOLs · 7 active build-in-public · avg engagement 3.4%' },
  },

  // ── Outreach module ──
  {
    id: 'pitch-gen', name: 'AI-Generated Pitch Email', tag: 'Soon', module: 'outreach',
    pitch: 'Personalized cold emails. One per creator. Auto.',
    hook: 'Drop your URL. We write 50 personalized pitches.',
    summary: 'Reads your site. Reads the creator\'s last 20 posts. Writes a pitch that references their actual content.',
    problem: 'Generic outreach gets 0.4% reply. Personalized outreach gets 18%. But personalized at scale = 40 hours/week.',
    solution: 'Agent reads creator content. Writes pitch with specific reference. You approve. Sends.',
    example: { input: '50 creators', output: '50 unique pitches · avg specificity score 0.84 · est. 9 replies' },
  },
  {
    id: 'email-seq', name: 'Email Sequence Auto-Send', tag: 'Soon', module: 'outreach',
    pitch: 'Send. Follow up. Track. All auto.',
    hook: 'A sequence engine that doesn\'t feel like a sequence engine.',
    summary: 'Multi-step email sequences with smart follow-ups, reply detection, and natural-language A/B testing.',
    problem: 'Mailchimp is a sledgehammer. You need a scalpel for 50 high-value creators.',
    solution: 'Sequence builder, smart pause-on-reply, A/B framing, deliverability rotation.',
    example: { input: '3-step sequence × 50', output: 'Sent 50 · opens 41 · replies 9 · meetings booked 3' },
  },
  {
    id: 'instagram-dm', name: 'Instagram DM Automation', tag: 'Soon', module: 'outreach',
    pitch: 'Personalized IG DMs at scale. Without bans.',
    hook: 'DM 30 creators a day. Look human doing it.',
    summary: 'Browser-based, account-warmed DM dispatcher. Personalized. Rate-limited. Ban-safe.',
    problem: 'IG\'s API is locked. Manual DMs take forever. Cheap automation tools get you banned.',
    solution: 'Real-browser session, drip-paced sends, content-aware messages. Stays under detection thresholds.',
    example: { input: '30 IG creators', output: 'Sent 30 · opened 22 · replies 6 · 0 account flags' },
  },
  {
    id: 'twitter-dm', name: 'X / Twitter DM', tag: 'Soon', module: 'outreach',
    pitch: 'DM the right KOLs. Without spamming.',
    hook: 'A DM that reads like a real reply.',
    summary: 'X DM outreach with conversation history awareness — references the KOL\'s recent post, asks a real question, no pitch in DM #1.',
    problem: 'X DMs from strangers feel like spam. Most go to "Message Requests" purgatory.',
    solution: 'Warm pre-engagement (replies, likes) before DM. DM #1 is a question, not a pitch. Pitch lands in DM #3.',
    example: { input: '20 X KOLs', output: 'Sent 20 · 14 read · 7 replies · 2 calls booked' },
  },
  {
    id: 'whatsapp', name: 'WhatsApp Outreach', tag: 'Soon', module: 'outreach',
    pitch: 'Reach SEA creators where they actually live.',
    hook: 'For SEA + LATAM, WhatsApp converts 6× email.',
    summary: 'Compliant WhatsApp Business outreach for markets where email is dead.',
    problem: 'In SEA, LATAM, and parts of Africa, email gets 0.1% reply. WhatsApp gets 22%.',
    solution: 'Pre-warmed WA Business numbers. Region-aware compliance. Native language pitch generation.',
    example: { input: 'Market: Indonesia', output: 'Sent 25 · 19 read · 6 replies · avg response < 4h' },
  },

  // ── Manage module ──
  {
    id: 'pipeline', name: 'Partnership Pipeline', tag: 'Soon', module: 'manage',
    pitch: 'One Kanban for every creator deal in flight.',
    hook: 'Your CRM, but for creator deals.',
    summary: 'Stages: prospect → contacted → reply → negotiation → live → reporting. Auto-moves cards on email events.',
    problem: 'You\'re juggling 40 creators across email, Notion, and a half-finished spreadsheet. You miss follow-ups.',
    solution: 'Pipeline auto-syncs from email + DMs. Stage transitions trigger reminders. Close-rate analytics built in.',
    example: { input: 'Pipeline view', output: '47 deals · 12 in negotiation · 4 going live this week · win rate 31%' },
  },
  {
    id: 'reply-track', name: 'Reply Tracking', tag: 'Soon', module: 'manage',
    pitch: 'Who replied. Who didn\'t. Who\'s ghosting.',
    hook: 'Stop digging through your inbox.',
    summary: 'Aggregates every channel — email, IG, X DM, WhatsApp — into one reply view. Color-coded by recency and intent.',
    problem: 'A "no reply" might be on Instagram. You forgot you sent it.',
    solution: 'Cross-channel reply view. Open rate, reply rate, intent scoring. One inbox.',
    example: { input: 'Last 30 days', output: 'Sent 142 · replied 38 (27%) · positive intent 24 · ghosted 104' },
  },
  {
    id: 'pattern-find', name: 'Pattern Recognition', tag: 'Soon', module: 'manage',
    pitch: 'Tells you which creator type actually converts.',
    hook: 'Find the pattern in your wins.',
    summary: 'Looks at your closed deals. Surfaces what they have in common — niche, audience size, content cadence, timezone.',
    problem: 'You\'re running on gut feel. Your gut is wrong about which creators convert.',
    solution: 'Statistical pattern-finding across your historical deals. Tells you "creators with 20–60k subs in dev-tools convert 4× more for you."',
    example: { input: 'Your 47 closed deals', output: 'Top pattern: indie devs · 30–80k subs · weekly cadence · 4.1× ROI' },
  },
  {
    id: 'knowledge-base', name: 'Brand Knowledge Base', tag: 'Soon', module: 'manage',
    pitch: 'Upload once. Every agent uses it forever.',
    hook: 'Your brand\'s memory, in one place.',
    summary: 'A persistent knowledge layer the agents read from. Brand voice, ICP, value props, past pitches that worked.',
    problem: 'You re-explain your product to every tool, every prompt, every teammate. It drifts.',
    solution: 'One place to define brand. Every agent reads from it. Pitches stay on-voice across channels.',
    example: { input: 'Upload brand doc', output: 'Indexed · 24 facts · used by 8 agents · drift score 0.02' },
  },

  // ── Distribution soon ──
  {
    id: 'reddit-grow', name: 'Reddit Account Farming', tag: 'Soon', module: 'distribution',
    pitch: 'Auto-grown Reddit accounts. Aged and warmed.',
    hook: 'Reddit needs karma. Karma needs time. We have time.',
    summary: 'Slow-burn Reddit account warming — niche-relevant comments, organic karma growth, ban-resistant patterns.',
    problem: 'Reddit doesn\'t trust new accounts. Posting from a fresh account = shadowban.',
    solution: 'Warm a portfolio of accounts. Each ages naturally. Use them for legitimate distribution.',
    example: { input: '5 accounts × 60 days', output: 'Avg karma 2,400 · all accounts good standing · ready to post' },
  },
]

export function getFeatureById(id: string): Feature | undefined {
  return FEATURES.find(f => f.id === id)
}

export function getFeaturesByModule(moduleId: string): Feature[] {
  return FEATURES.filter(f => f.module === moduleId)
}

export function getLiveFeatures(): Feature[] {
  return FEATURES.filter(f => f.tag === 'Live')
}

export function getSoonFeatures(): Feature[] {
  return FEATURES.filter(f => f.tag === 'Soon')
}
