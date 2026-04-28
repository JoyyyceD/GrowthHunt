import type { Metadata } from 'next'
import { getStory } from '@/lib/growth-story'
import GrowthStoryPage from '../_shared/GrowthStoryPage'

export async function generateMetadata(): Promise<Metadata> {
  const story = getStory('cursor', 'zh')
  if (!story) return {}
  const url = 'https://growthhunt.ai/growth-story/cursor'
  return {
    title: story.title,
    description: story.description,
    alternates: {
      canonical: url,
      languages: { 'en-US': '/growth-story/cursor/en', 'zh-CN': url },
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

export default function CursorZhPage() {
  return <GrowthStoryPage company="cursor" locale="zh" />
}
