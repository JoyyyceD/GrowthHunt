import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { getAllCompanies, type Timeline, type EventType } from './growth-story'

const STORIES_DIR = path.join(process.cwd(), 'content/growth-stories')

export interface Launch {
  /** Stable slug, derived from filename minus locale + .mdx */
  slug: string
  company: {
    slug: string
    name: string
    seriesNumber?: number
  }
  title: string
  description: string
  /** ISO date string */
  date: string
  type: EventType
  gtmTag?: string
  eventTitle?: string
  externalUrl?: string
}

function loadTimeline(slug: string): Timeline | null {
  const p = path.join(STORIES_DIR, slug, 'timeline.json')
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Timeline
  } catch {
    return null
  }
}

/**
 * Walk every company's events directory and return one Launch per .mdx file.
 * Each Launch is a full-process breakdown of a single launch / GTM moment.
 */
export function getAllLaunches(locale: 'en' | 'zh' = 'en'): Launch[] {
  const launches: Launch[] = []
  const wantZh = locale === 'zh'

  for (const companySlug of getAllCompanies()) {
    const eventsDir = path.join(STORIES_DIR, companySlug, 'events')
    if (!fs.existsSync(eventsDir)) continue

    const timeline = loadTimeline(companySlug)
    const companyName = timeline?.company.name ?? companySlug
    const seriesNumber = timeline?.company.seriesNumber

    const allFiles = fs.readdirSync(eventsDir).filter(f => f.endsWith('.mdx'))

    // Build a slug -> { en, zh } map so we always emit one Launch per slug,
    // preferring the requested locale.
    const bySlug = new Map<string, { en?: string; zh?: string }>()
    for (const f of allFiles) {
      const isZh = f.endsWith('.zh.mdx')
      const slug = f.replace(/\.zh\.mdx$/, '').replace(/\.mdx$/, '')
      const entry = bySlug.get(slug) ?? {}
      if (isZh) entry.zh = f
      else entry.en = f
      bySlug.set(slug, entry)
    }

    for (const [slug, files] of bySlug) {
      const file = wantZh ? (files.zh ?? files.en) : files.en
      if (!file) continue
      const fp = path.join(eventsDir, file)
      let fm
      try {
        fm = matter(fs.readFileSync(fp, 'utf-8'))
      } catch {
        continue
      }
      const data = fm.data ?? {}
      launches.push({
        slug,
        company: { slug: companySlug, name: companyName, seriesNumber },
        title: (data.title as string) ?? slug,
        description: (data.description as string) ?? '',
        date: (data.date as string) ?? slug.slice(0, 7),
        type: ((data.type as EventType) ?? 'product') as EventType,
        gtmTag: data.gtmTag as string | undefined,
        eventTitle: data.eventTitle as string | undefined,
        externalUrl: data.externalUrl as string | undefined,
      })
    }
  }

  return launches
}

/** Sort by date desc (newest first). */
export function sortLaunchesByDate(launches: Launch[]): Launch[] {
  return [...launches].sort((a, b) => b.date.localeCompare(a.date))
}

/** Unique companies in seriesNumber order. */
export function getLaunchCompanies(launches: Launch[]): Array<{ slug: string; name: string }> {
  const map = new Map<string, { slug: string; name: string; seriesNumber: number }>()
  for (const l of launches) {
    if (map.has(l.company.slug)) continue
    map.set(l.company.slug, {
      slug: l.company.slug,
      name: l.company.name,
      seriesNumber: l.company.seriesNumber ?? Number.MAX_SAFE_INTEGER,
    })
  }
  return Array.from(map.values())
    .sort((a, b) => a.seriesNumber - b.seriesNumber || a.name.localeCompare(b.name))
    .map(({ slug, name }) => ({ slug, name }))
}
