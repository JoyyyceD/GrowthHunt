import type { Metadata } from 'next'
import { getAllCompanies, getStory } from '@/lib/growth-story'
import GrowthStoryPage from '../../_shared/GrowthStoryPage'

interface Props {
  params: Promise<{ company: string }>
}

export async function generateStaticParams() {
  // 'cursor' has its own static route at /growth-story/cursor/zh
  return getAllCompanies()
    .filter(company => company !== 'cursor')
    .map(company => ({ company }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { company } = await params
  // Chinese page: try zh first, fall back to en for metadata
  const story = getStory(company, 'zh') ?? getStory(company, 'en')
  if (!story) return {}
  const url = `https://growthhunt.ai/growth-story/${company}/zh`
  return {
    title: story.title,
    description: story.description,
    alternates: {
      canonical: url,
      languages: {
        'zh-CN': url,
        'en-US': `/growth-story/${company}`,
      },
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

export default async function CompanyZhPage({ params }: Props) {
  const { company } = await params
  return <GrowthStoryPage company={company} locale="zh" />
}
