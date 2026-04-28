import type { Metadata } from 'next'
import { getStory } from '@/lib/growth-story'
import GrowthStoryPage from '../../_shared/GrowthStoryPage'

export async function generateMetadata(): Promise<Metadata> {
  const story = getStory('cursor', 'en')
  if (!story) return {}
  const url = 'https://growthhunt.ai/growth-story/cursor/en'
  return {
    title: story.title,
    description: story.description,
    alternates: {
      canonical: url,
      languages: { 'en-US': url, 'zh-CN': '/growth-story/cursor' },
    },
    openGraph: {
      type: 'article',
      url,
      title: story.title,
      description: story.description,
      publishedTime: story.date,
    },
    twitter: { card: 'summary_large_image', title: story.title, description: story.description },
  }
}

export default function CursorEnPage() {
  return <GrowthStoryPage company="cursor" locale="en" />
}
