import { getAllPosts } from '@/lib/blog'

const BASE = 'https://growthhunt.ai'
const FEED_TITLE = 'GrowthHunt Blog'
const FEED_DESCRIPTION =
  'GTM playbooks for indie hackers and SaaS founders — creator outreach, cold email, directories, and channel deep-dives.'

// Escape the five XML-special characters so post titles/descriptions
// can't break the feed.
function xml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export const revalidate = 3600

export async function GET() {
  const posts = getAllPosts()
  const latest = posts[0]?.date ? new Date(posts[0].date) : new Date()

  const items = posts
    .map(post => {
      const url = `${BASE}/blog/${post.slug}`
      const pubDate = post.date ? new Date(post.date).toUTCString() : new Date().toUTCString()
      return `    <item>
      <title>${xml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${xml(post.description)}</description>
    </item>`
    })
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(FEED_TITLE)}</title>
    <link>${BASE}/blog</link>
    <description>${xml(FEED_DESCRIPTION)}</description>
    <language>en-US</language>
    <lastBuildDate>${latest.toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
