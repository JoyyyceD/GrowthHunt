import type { Metadata } from 'next'

export const SITE_URL = 'https://growthhunt.ai'
export const SITE_NAME = 'GrowthHunt'
export const SHARE_DESCRIPTION = 'Find software for work and creativity.'
export const PUBLISHER_ID = `${SITE_URL}/#organization`
export const WEBSITE_ID = `${SITE_URL}/#website`

// Actual editorial revisions, maintained when the page content changes.
// Missing entries intentionally omit lastmod; a build is not a content revision.
export const pageContentModified: Record<string, string> = {
  '/': '2026-11-02',
  '/ai-tools': '2026-11-02',
  '/guides': '2026-11-02',
}

export function contentDate(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  if (value.length === 10 && date.toISOString().slice(0, 10) !== value) return undefined
  return value
}

export function newestContentDate(values: unknown[]): string | undefined {
  return values.map(contentDate).filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
}

export function editorialMetadata({ title, description, path, article = false, modified }: {
  title: string
  description: string
  path: string
  article?: boolean
  modified?: string
}): Metadata {
  const url = `${SITE_URL}${path}`
  const image = { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: `${SITE_NAME} — ${SHARE_DESCRIPTION}` }
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: article ? 'article' : 'website', url, title, description, siteName: SITE_NAME,
      images: [image],
      ...(article && contentDate(modified) ? { modifiedTime: modified } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export interface BreadcrumbItem { name: string; path: string }

export function breadcrumbSchema(path: string, items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList', '@id': `${SITE_URL}${path}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: `${SITE_URL}${item.path}`,
    })),
  }
}

export function editorialArticleSchema({ path, title, description, modified, prepared, sourceChecked, citations = [], breadcrumbs, about }: {
  path: string
  title: string
  description: string
  modified: string
  prepared?: string
  sourceChecked?: string
  citations?: string[]
  breadcrumbs: BreadcrumbItem[]
  about?: { name: string; url: string }
}) {
  const url = `${SITE_URL}${path}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description,
        isPartOf: { '@id': WEBSITE_ID }, mainEntity: { '@id': `${url}#article` },
        breadcrumb: { '@id': `${url}#breadcrumb` }, inLanguage: 'en',
        ...(contentDate(sourceChecked) ? { lastReviewed: sourceChecked } : {}),
        ...(contentDate(modified) ? { dateModified: modified } : {}),
      },
      {
        '@type': 'Article', '@id': `${url}#article`, headline: title, description,
        mainEntityOfPage: { '@id': `${url}#webpage` }, isPartOf: { '@id': WEBSITE_ID },
        author: { '@type': 'Organization', '@id': PUBLISHER_ID, name: SITE_NAME, url: `${SITE_URL}/about` },
        publisher: { '@id': PUBLISHER_ID }, inLanguage: 'en',
        ...(contentDate(modified) ? { dateModified: modified } : {}),
        ...(contentDate(prepared) ? { dateCreated: prepared } : {}),
        ...(citations.length ? { citation: citations } : {}),
        ...(about ? { about: { '@type': 'SoftwareApplication', name: about.name, url: about.url } } : {}),
        // datePublished is intentionally absent until the page actually goes live.
      },
      breadcrumbSchema(path, breadcrumbs),
    ],
  }
}

export function collectionSchema({ path, title, description, items, modified }: {
  path: string
  title: string
  description: string
  items: { name: string; path: string }[]
  modified?: string
}) {
  const url = `${SITE_URL}${path}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': `${url}#webpage`, url, name: title, description,
        isPartOf: { '@id': WEBSITE_ID }, mainEntity: { '@id': `${url}#list` }, inLanguage: 'en',
        ...(contentDate(modified) ? { dateModified: modified } : {}),
      },
      {
        '@type': 'ItemList', '@id': `${url}#list`, numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem', position: index + 1, name: item.name, url: `${SITE_URL}${item.path}`,
        })),
      },
    ],
  }
}

export function displayContentDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}
