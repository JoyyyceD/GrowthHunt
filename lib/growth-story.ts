import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const STORIES_DIR = path.join(process.cwd(), 'content/growth-stories')

export type EventType = 'product' | 'funding' | 'media' | 'acquisition'

export interface TimelineEvent {
  date: string
  title: string
  type: EventType
  gtmTag?: string
  description: string
  externalUrl?: string
  articleSlug?: string
}

export interface DataPoint {
  date: string
  value: number
  source: string
  confidence: 'official' | 'media' | 'estimate'
  round?: string
}

export interface Phase {
  start: string
  end: string
  name: string
  color: string
}

export interface CompanyMeta {
  slug: string
  name: string
  legalName: string
  tagline: string
  summary: string
  founded: string
  founders: string[]
}

export interface Platform {
  slug: string
  name: string
  score: number
  bestStage: string
  effort: string
  role: string
  description: string
  catalyst: string
  catalystUrl?: string
  accountUrl?: string
  accountLabel?: string
  whenItWorks: string
  whenItDoesnt: string
}

export interface Timeline {
  company: CompanyMeta
  phases: Phase[]
  events: TimelineEvent[]
  arr: DataPoint[]
  valuation: DataPoint[]
  platforms?: Platform[]
}

export interface GrowthStoryMain {
  slug: string
  title: string
  description: string
  date: string
  readTime: string
  content: string
  timeline: Timeline
}

export interface EventArticle {
  company: string
  slug: string
  title: string
  description: string
  date: string
  type: EventType
  gtmTag?: string
  eventTitle: string
  externalUrl?: string
  content: string
}

export function getAllCompanies(): string[] {
  if (!fs.existsSync(STORIES_DIR)) return []
  return fs
    .readdirSync(STORIES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
}

export function getStory(company: string): GrowthStoryMain | null {
  const indexPath = path.join(STORIES_DIR, company, 'index.mdx')
  const timelinePath = path.join(STORIES_DIR, company, 'timeline.json')
  if (!fs.existsSync(indexPath) || !fs.existsSync(timelinePath)) return null

  const raw = fs.readFileSync(indexPath, 'utf-8')
  const { data, content } = matter(raw)
  const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf-8')) as Timeline

  return {
    slug: company,
    title: data.title ?? '',
    description: data.description ?? '',
    date: data.date ?? '',
    readTime: data.readTime ?? '10 min',
    content,
    timeline,
  }
}

export function getEventArticle(company: string, slug: string): EventArticle | null {
  const filePath = path.join(STORIES_DIR, company, 'events', `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  return {
    company,
    slug,
    title: data.title ?? '',
    description: data.description ?? '',
    date: data.date ?? '',
    type: (data.type ?? 'media') as EventType,
    gtmTag: data.gtmTag,
    eventTitle: data.eventTitle ?? data.title ?? '',
    externalUrl: data.externalUrl,
    content,
  }
}

export function getAllEventSlugs(company: string): string[] {
  const dir = path.join(STORIES_DIR, company, 'events')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx$/, ''))
}
