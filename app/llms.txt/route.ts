// Serves /llms.txt — a curated, LLM-friendly map of the site for AI search
// engines and assistants (ChatGPT, Perplexity, Claude, etc.). Generated from
// the live blog + growth-story content so it stays current on every build.

import { tools, guides } from '@/lib/editorial'
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
    '> AI and software discovery for individuals, creators, and small teams: documents, video, meetings, AI assistants, and design.',
    '',
    'GrowthHunt publishes documentation-based software overviews, buying checklists, and startup case studies. Affiliate links are disclosed; a vendor overview is not a hands-on test.',
    '',
    '## Software guides',
    ...tools.map(tool => `- [${tool.name}](${BASE}/ai-tools/${tool.slug}): ${tool.task}. Official-source overview.`),
    ...guides.map(guide => `- [${guide.title}](${BASE}/guides/${guide.slug})`),
    `- [Affiliate disclosure](${BASE}/affiliate-disclosure)`,
    `- [Editorial policy](${BASE}/editorial-policy)`,
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
