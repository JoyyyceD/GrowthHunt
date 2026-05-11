import fs from 'fs'
import path from 'path'
import { getAllCompanies, type Platform, type Timeline } from './growth-story'

export { channelKey, getChannelFilters } from './channel-buckets'

const STORIES_DIR = path.join(process.cwd(), 'content/growth-stories')

export interface ChannelPlay extends Platform {
  company: {
    slug: string
    name: string
    tagline: string
    seriesNumber?: number
  }
}

export interface CompanyPlaybook {
  slug: string
  name: string
  tagline: string
  seriesNumber?: number
  channels: ChannelPlay[]
}

/**
 * Aggregate every company's marketing channel mix ("组合拳").
 * Each timeline.json has a `platforms` array describing which channels the
 * company used, with role / score / catalyst / whenItWorks / whenItDoesnt.
 */
export function getAllPlaybooks(locale: 'en' | 'zh' = 'en'): CompanyPlaybook[] {
  const companies = getAllCompanies()
  const timelineFile = locale === 'zh' ? 'timeline.zh.json' : 'timeline.json'

  const playbooks: CompanyPlaybook[] = []

  for (const slug of companies) {
    const localePath = path.join(STORIES_DIR, slug, timelineFile)
    const enPath = path.join(STORIES_DIR, slug, 'timeline.json')
    const resolved = fs.existsSync(localePath) ? localePath : enPath
    if (!fs.existsSync(resolved)) continue

    let timeline: Timeline
    try {
      timeline = JSON.parse(fs.readFileSync(resolved, 'utf-8')) as Timeline
    } catch {
      continue
    }

    const platforms = timeline.platforms ?? []
    if (platforms.length === 0) continue

    const channels: ChannelPlay[] = platforms.map(p => ({
      ...p,
      company: {
        slug: timeline.company.slug,
        name: timeline.company.name,
        tagline: timeline.company.tagline,
        seriesNumber: timeline.company.seriesNumber,
      },
    }))
    // Sort each company's channels by score desc (most load-bearing first)
    channels.sort((a, b) => b.score - a.score)

    playbooks.push({
      slug: timeline.company.slug,
      name: timeline.company.name,
      tagline: timeline.company.tagline,
      seriesNumber: timeline.company.seriesNumber,
      channels,
    })
  }

  return playbooks
}

/** Flat list of every channel-play across all companies. */
export function getAllChannelPlays(locale: 'en' | 'zh' = 'en'): ChannelPlay[] {
  return getAllPlaybooks(locale).flatMap(p => p.channels)
}

