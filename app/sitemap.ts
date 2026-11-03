import type { MetadataRoute } from 'next'
import { tools, guides } from '@/lib/editorial'
import { SITE_URL, contentDate, newestContentDate, pageContentModified } from '@/lib/editorial-seo'
import { FEATURES } from '@/lib/features'
import { getAllPosts } from '@/lib/blog'
import { getAllCompanies, getStory } from '@/lib/growth-story'
import { getAllChampionMeta } from '@/app/picolaunch/_lib/fetch'

// Unknown revision dates are omitted. No build-time or request-time clock is used.
function revision(value: unknown): { lastModified?: string } {
  const date = contentDate(value)
  return date ? { lastModified: date } : {}
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts()
  const featurePages: MetadataRoute.Sitemap = FEATURES.map(feature => ({
    url: `${SITE_URL}/${feature.id}`, changeFrequency: 'monthly', priority: feature.tag === 'Live' ? 0.8 : 0.6,
  }))
  const blogPosts: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${SITE_URL}/blog/${post.slug}`, ...revision(post.date), changeFrequency: 'monthly', priority: 0.7,
  }))

  // Creation timestamps are not revision timestamps. Preserve these URLs without lastmod.
  const championMeta = await getAllChampionMeta().catch(() => [])
  const picoLaunchDetails: MetadataRoute.Sitemap = championMeta.map(({ slug }) => ({
    url: `${SITE_URL}/picolaunch/${slug}`, changeFrequency: 'weekly', priority: 0.7,
  }))

  const stories = getAllCompanies().map(slug => ({ slug, en: getStory(slug, 'en'), zh: getStory(slug, 'zh') }))
  const growthStoryCompanies: MetadataRoute.Sitemap = stories.flatMap(({ slug, en, zh }) => {
    const enUrl = `${SITE_URL}/growth-story/${slug}`
    const zhUrl = `${SITE_URL}/growth-story/${slug}/zh`
    const alternates = { languages: { 'en-US': enUrl, 'zh-CN': zhUrl } }
    return [
      { url: enUrl, alternates, ...revision(en?.date), changeFrequency: 'monthly' as const, priority: 0.9 },
      { url: zhUrl, alternates, ...revision(zh?.date), changeFrequency: 'monthly' as const, priority: 0.9 },
    ]
  })

  const toolsModified = newestContentDate([pageContentModified['/ai-tools'], ...tools.map(tool => tool.contentModified)])
  const guidesModified = newestContentDate([pageContentModified['/guides'], ...guides.map(guide => guide.contentModified)])
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, ...revision(pageContentModified['/']), changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/ai-tools`, ...revision(toolsModified), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/guides`, ...revision(guidesModified), changeFrequency: 'weekly', priority: 0.8 },
    ...['about', 'contact', 'affiliate-disclosure', 'editorial-policy', 'privacy', 'terms'].map(slug => ({ url: `${SITE_URL}/${slug}`, ...revision(pageContentModified[`/${slug}`]) })),
    ...tools.map(tool => ({ url: `${SITE_URL}/ai-tools/${tool.slug}`, ...revision(tool.contentModified) })),
    ...guides.map(guide => ({ url: `${SITE_URL}/guides/${guide.slug}`, ...revision(guide.contentModified) })),
    { url: `${SITE_URL}/blog`, ...revision(newestContentDate(posts.map(post => post.date))), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/coming-soon`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/growth-story`, ...revision(newestContentDate(stories.flatMap(story => [story.en?.date, story.zh?.date]))), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/picolaunch`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/velocity`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/velocity/badge`, changeFrequency: 'monthly', priority: 0.5 },
    ...growthStoryCompanies, ...picoLaunchDetails, ...featurePages, ...blogPosts,
  ]
  return Array.from(new Map(entries.map(entry => [entry.url, entry])).values())
}
