import type { MetadataRoute } from 'next'
import { FEATURES } from '@/lib/features'
import { getAllPosts } from '@/lib/blog'
import { getAllCompanies } from '@/lib/growth-story'
import { getAllChampionSlugs } from '@/app/opchampion/_lib/fetch'

const BASE = 'https://growthhunt.ai'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const featurePages: MetadataRoute.Sitemap = FEATURES.map(f => ({
    url: `${BASE}/${f.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: f.tag === 'Live' ? 0.8 : 0.6,
  }))

  const blogPosts: MetadataRoute.Sitemap = getAllPosts().map(post => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // OPChampion — every champion gets its own sitemap entry so Google can
  // index each one (and pass dofollow link equity to the featured site).
  const championSlugs = await getAllChampionSlugs()
  const opChampionDetails: MetadataRoute.Sitemap = championSlugs.map(slug => ({
    url: `${BASE}/opchampion/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  // Each company has parallel EN + ZH pages. Emit both URLs and cross-link
  // them with hreflang alternates so Google treats them as locale variants
  // rather than duplicate content.
  const growthStoryCompanies: MetadataRoute.Sitemap = getAllCompanies().flatMap(slug => {
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
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.9,
      },
      {
        url: zhUrl,
        alternates,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.9,
      },
    ]
  })

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/coming-soon`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE}/growth-story`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE}/opchampion`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...growthStoryCompanies,
    ...opChampionDetails,
    ...featurePages,
    ...blogPosts,
  ]
}
