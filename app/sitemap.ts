import type { MetadataRoute } from 'next'
import { FEATURES } from '@/lib/features'
import { getAllPosts } from '@/lib/blog'
import { getAllCompanies, getStory } from '@/lib/growth-story'
import { getAllChampionMeta } from '@/app/picolaunch/_lib/fetch'

const BASE = 'https://growthhunt.ai'

// Build time — used as a stable lastmod for landing pages that don't have
// a content date of their own. Frozen per deploy, so Google sees a real
// "this rev = this date" signal instead of "everything was updated today".
const BUILD_DATE = new Date()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const featurePages: MetadataRoute.Sitemap = FEATURES.map(f => ({
    url: `${BASE}/${f.id}`,
    lastModified: BUILD_DATE,
    changeFrequency: 'monthly',
    priority: f.tag === 'Live' ? 0.8 : 0.6,
  }))

  const blogPosts: MetadataRoute.Sitemap = getAllPosts().map(post => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // PicoLaunch — every launch gets its own sitemap entry so Google can
  // index each one (and pass dofollow link equity to the featured site).
  const championMeta = await getAllChampionMeta()
  const picoLaunchDetails: MetadataRoute.Sitemap = championMeta.map(({ slug, createdAt }) => ({
    url: `${BASE}/picolaunch/${slug}`,
    lastModified: new Date(createdAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  // Each company has parallel EN + ZH pages. Emit both URLs and cross-link
  // them with hreflang alternates so Google treats them as locale variants
  // rather than duplicate content. lastmod = the frontmatter date of the
  // English story (zh is usually a translation of the same content).
  const growthStoryCompanies: MetadataRoute.Sitemap = getAllCompanies().flatMap(slug => {
    const story = getStory(slug, 'en')
    const lastModified = story?.date ? new Date(story.date) : BUILD_DATE
    const enUrl = `${BASE}/growth-story/${slug}`
    const zhUrl = `${BASE}/growth-story/${slug}/zh`
    const alternates = {
      languages: {
        'en-US': enUrl,
        'zh-CN': zhUrl,
      },
    }
    return [
      {
        url: enUrl,
        alternates,
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.9,
      },
      {
        url: zhUrl,
        alternates,
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.9,
      },
    ]
  })

  return [
    {
      url: BASE,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE}/blog`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/coming-soon`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE}/growth-story`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE}/picolaunch`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...growthStoryCompanies,
    ...picoLaunchDetails,
    ...featurePages,
    ...blogPosts,
  ]
}
