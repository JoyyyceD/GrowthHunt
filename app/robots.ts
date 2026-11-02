import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: process.env.GH_REVIEW_PREVIEW === '1' ? { userAgent: '*', disallow: '/' } : { userAgent: '*', allow: '/' },
    sitemap: 'https://growthhunt.ai/sitemap.xml',
  }
}
