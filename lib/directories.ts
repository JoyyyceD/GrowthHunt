import { createAdminClient } from '@/lib/supabase/admin'

export interface Directory {
  id: string
  slug: string
  name: string
  url: string
  submissionUrl: string | null
  dr: number | null
  trafficText: string | null
  categories: string[]
  doFollow: boolean | null
  needsAccount: boolean
  hasCaptcha: boolean
  priceTier: 'free' | 'freemium' | 'paid' | 'featured'
  submissionMethod: 'form' | 'email' | 'github_pr' | 'api' | 'manual'
  approvalEta: string | null
  notes: string | null
  featured: boolean
}

export const CATEGORIES = [
  'AI Assistants & Virtual Agents',
  'Business & B2B Solutions',
  'Cybersecurity & Privacy',
  'Directories & Aggregators',
  'E-commerce & Marketplaces',
  'EdTech & Learning',
  'Finance, FinTech & Crypto',
  'HealthTech & Wellness',
  'HR & Future of Work',
  'Industry-Specific Software',
  'LegalTech & GovTech',
  'Marketing, SEO & Content',
  'Media & Community',
  'Real Estate & PropTech',
  'Technology & Software',
] as const

export type Category = typeof CATEGORIES[number]

interface Row {
  id: string
  slug: string
  name: string
  url: string
  submission_url: string | null
  dr: number | null
  monthly_traffic: string | null
  categories: string[]
  do_follow: boolean | null
  needs_account: boolean
  has_captcha: boolean
  price_tier: Directory['priceTier']
  submission_method: Directory['submissionMethod']
  approval_eta: string | null
  notes: string | null
  featured: boolean
}

function rowToDirectory(r: Row): Directory {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    url: r.url,
    submissionUrl: r.submission_url,
    dr: r.dr,
    trafficText: r.monthly_traffic,
    categories: r.categories ?? [],
    doFollow: r.do_follow,
    needsAccount: r.needs_account,
    hasCaptcha: r.has_captcha,
    priceTier: r.price_tier,
    submissionMethod: r.submission_method,
    approvalEta: r.approval_eta,
    notes: r.notes,
    featured: r.featured,
  }
}

/**
 * Fetch all active directories ordered by DR (highest first), then featured.
 * Server-side only — uses admin client for stability.
 */
export async function fetchDirectories(): Promise<Directory[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('listingbott_directories')
    .select('*')
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('dr', { ascending: false, nullsFirst: false })
    .order('name')

  if (error) {
    console.error('[directories] fetch error', error)
    return []
  }

  return (data ?? []).map(rowToDirectory)
}
