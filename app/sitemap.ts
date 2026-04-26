import type { MetadataRoute } from 'next'
import { FEATURES } from '@/lib/features'

const BASE = 'https://growthhunt.ai'

export default function sitemap(): MetadataRoute.Sitemap {
  const featurePages: MetadataRoute.Sitemap = FEATURES.map(f => ({
    url: `${BASE}/${f.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: f.tag === 'Live' ? 0.8 : 0.6,
  }))

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...featurePages,
  ]
}
