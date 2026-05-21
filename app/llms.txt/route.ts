// Serves /llms.txt — a curated, LLM-friendly map of the site for AI search
// engines and assistants (ChatGPT, Perplexity, Claude, etc.). Generated from
// the live blog + growth-story content so it stays current on every build.

import { getAllPosts } from '@/lib/blog'
import { getAllCompanies, getStory } from '@/lib/growth-story'

export const dynamic = 'force-static'

const BASE = 'https://growthhunt.ai'

export function GET() {
  const posts = getAllPosts()
  const stories = getAllCompanies()
    .map(slug => getStory(slug, 'en'))
    .filter((s): s is NonNullable<ReturnType<typeof getStory>> => s !== null)

  const lines: string[] = [
    '# GrowthHunt',
    '',
    '> An all-in-one go-to-market toolkit for indie AI founders — six free tools plus a deep library of startup growth case studies.',
    '',
    'GrowthHunt helps early-stage founders get their product in front of users: find the creators their buyers already trust, write and send the pitch, grow on X, and learn which growth patterns actually convert. Every tool listed below is free and live now.',
    '',
    '## Live tools',
    `- [Velocity](${BASE}/velocity): Free weekly leaderboard of the fastest-growing GitHub repos, the fastest-growing AI founders on X, and the most viral AI products.`,
    `- [X Grower](${BASE}/xgrower): Chrome extension that grows an indie founder's X account from 0 to 1,000 followers with AI-drafted replies.`,
    `- [ViralX](${BASE}/viralx): 10,000+ viral tweet templates from 500+ AI founders — pick a pattern, customize it, schedule it, post it.`,
    `- [PicoLaunch](${BASE}/picolaunch): A weekly launch board for AI startups doing real go-to-market.`,
    `- [Growth Story](${BASE}/growth-story): Deep-dive timelines of how breakout startups actually grew.`,
    `- [Get Backlinks](${BASE}/get-backlinks): Directory-submission service that builds backlinks for startups.`,
    '',
    '## Growth case studies',
    'Founder-by-founder teardowns of how notable AI and SaaS companies grew, each with hard numbers, the tactics used, and what does not transfer.',
    '',
    ...posts.map(p => `- [${p.title}](${BASE}/blog/${p.slug}): ${p.description}`),
    '',
    '## Startup growth stories',
    'Full chronological growth timelines — funding, product launches, and go-to-market bets.',
    '',
    ...stories.map(s => `- [${s.timeline.company.name}](${BASE}/growth-story/${s.slug}): ${s.timeline.company.tagline}`),
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
