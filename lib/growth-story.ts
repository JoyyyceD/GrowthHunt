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
  seriesNumber?: number
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
  const slugs = fs
    .readdirSync(STORIES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  // Sort by company.seriesNumber from each timeline.json (1, 2, 3, ...).
  // Falls back to a large number for any company missing seriesNumber so it
  // sorts to the end; ties resolve alphabetically for stability.
  const slugsWithOrder = slugs.map(slug => {
    let seriesNumber = Number.MAX_SAFE_INTEGER
    try {
      const t = JSON.parse(
        fs.readFileSync(path.join(STORIES_DIR, slug, 'timeline.json'), 'utf-8'),
      ) as Partial<Timeline>
      if (typeof t.company?.seriesNumber === 'number') {
        seriesNumber = t.company.seriesNumber
      }
    } catch {
      // ignore — fall through to MAX_SAFE_INTEGER
    }
    return { slug, seriesNumber }
  })

  slugsWithOrder.sort((a, b) => {
    if (a.seriesNumber !== b.seriesNumber) return a.seriesNumber - b.seriesNumber
    return a.slug.localeCompare(b.slug)
  })

  return slugsWithOrder.map(x => x.slug)
}

export function getStory(company: string, locale: 'en' | 'zh' = 'en'): GrowthStoryMain | null {
  const indexFile = locale === 'zh' ? 'index.zh.mdx' : 'index.mdx'
  const timelineFile = locale === 'zh' ? 'timeline.zh.json' : 'timeline.json'

  const indexPath = path.join(STORIES_DIR, company, indexFile)
  const timelinePath = path.join(STORIES_DIR, company, timelineFile)

  // Fall back to English files if locale-specific ones don't exist
  const resolvedIndex = fs.existsSync(indexPath) ? indexPath : path.join(STORIES_DIR, company, 'index.mdx')
  const resolvedTimeline = fs.existsSync(timelinePath) ? timelinePath : path.join(STORIES_DIR, company, 'timeline.json')

  if (!fs.existsSync(resolvedIndex) || !fs.existsSync(resolvedTimeline)) return null

  const raw = fs.readFileSync(resolvedIndex, 'utf-8')
  const { data, content } = matter(raw)
  const timeline = JSON.parse(fs.readFileSync(resolvedTimeline, 'utf-8')) as Timeline

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

export function getEventArticle(company: string, slug: string, locale: 'en' | 'zh' = 'en'): EventArticle | null {
  const file = locale === 'zh' ? `${slug}.zh.mdx` : `${slug}.mdx`
  const filePath = path.join(STORIES_DIR, company, 'events', file)

  // Fall back to English if locale-specific file doesn't exist
  const resolved = fs.existsSync(filePath)
    ? filePath
    : path.join(STORIES_DIR, company, 'events', `${slug}.mdx`)

  if (!fs.existsSync(resolved)) return null

  const raw = fs.readFileSync(resolved, 'utf-8')
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
