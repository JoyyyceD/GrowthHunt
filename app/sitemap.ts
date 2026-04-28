import type { MetadataRoute } from 'next'
import { FEATURES } from '@/lib/features'
import { getAllPosts } from '@/lib/blog'

const BASE = 'https://growthhunt.ai'

export default function sitemap(): MetadataRoute.Sitemap {
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
      priority: 0.8,
    },
    ...featurePages,
    ...blogPosts,
  ]
}
