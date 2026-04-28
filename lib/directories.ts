export interface Directory {
  id: string
  name: string
  url: string
  dr: number
  traffic: string
  categories: string[]
  description?: string
  doFollow?: boolean
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

export const DIRECTORIES: Directory[] = [
  // ── Tier 1: General / High-DR ──────────────────────────────────────────────
  {
    id: 'product-hunt',
    name: 'Product Hunt',
    url: 'https://www.producthunt.com',
    dr: 90,
    traffic: '32.1M',
    categories: ['Technology & Software', 'Media & Community', 'Directories & Aggregators'],
    doFollow: true,
  },
  {
    id: 'capterra',
    name: 'Capterra',
    url: 'https://www.capterra.com',
    dr: 93,
    traffic: '4.2M',
    categories: ['Technology & Software', 'Business & B2B Solutions', 'Marketing, SEO & Content', 'E-commerce & Marketplaces'],
    doFollow: true,
  },
  {
    id: 'g2',
    name: 'G2',
    url: 'https://www.g2.com',
    dr: 91,
    traffic: '5.8M',
    categories: ['Technology & Software', 'Business & B2B Solutions', 'Marketing, SEO & Content'],
    doFollow: true,
  },
  {
    id: 'getapp',
    name: 'GetApp',
    url: 'https://www.getapp.com',
    dr: 88,
    traffic: '3.1M',
    categories: ['Technology & Software', 'Business & B2B Solutions'],
    doFollow: true,
  },
  {
    id: 'crunchbase',
    name: 'Crunchbase',
    url: 'https://www.crunchbase.com',
    dr: 91,
    traffic: '14.2M',
    categories: ['Business & B2B Solutions', 'Finance, FinTech & Crypto', 'Technology & Software'],
    doFollow: false,
  },
  {
    id: 'alternativeto',
    name: 'AlternativeTo',
    url: 'https://alternativeto.net',
    dr: 84,
    traffic: '2.3M',
    categories: ['Technology & Software', 'Directories & Aggregators'],
    doFollow: true,
  },
  {
    id: 'sourceforge',
    name: 'SourceForge',
    url: 'https://sourceforge.net',
    dr: 92,
    traffic: '6.1M',
    categories: ['Technology & Software', 'Industry-Specific Software'],
    doFollow: true,
  },
  {
    id: 'softwaresuggest',
    name: 'SoftwareSuggest',
    url: 'https://www.softwaresuggest.com',
    dr: 68,
    traffic: '890K',
    categories: ['Technology & Software', 'Business & B2B Solutions'],
    doFollow: true,
  },
  {
    id: 'saasworthy',
    name: 'SaaSworthy',
    url: 'https://www.saasworthy.com',
    dr: 72,
    traffic: '256K',
    categories: ['Technology & Software', 'Business & B2B Solutions'],
    doFollow: true,
  },
  {
    id: 'slant',
    name: 'Slant',
    url: 'https://www.slant.co',
    dr: 76,
    traffic: '1.1M',
    categories: ['Technology & Software', 'Directories & Aggregators'],
    doFollow: true,
  },

  // ── Tier 2: AI / Tech-focused ──────────────────────────────────────────────
  {
    id: 'there-is-an-ai-for-that',
    name: 'There\'s An AI For That',
    url: 'https://theresanaiforthat.com',
    dr: 73,
    traffic: '2.8M',
    categories: ['AI Assistants & Virtual Agents', 'Technology & Software'],
    doFollow: true,
  },
  {
    id: 'futurepedia',
    name: 'Futurepedia',
    url: 'https://www.futurepedia.io',
    dr: 66,
    traffic: '780K',
    categories: ['AI Assistants & Virtual Agents', 'Technology & Software'],
    doFollow: true,
  },
  {
    id: 'ai-tool',
    name: 'AI Tool',
    url: 'https://aitool.ai',
    dr: 54,
    traffic: '320K',
    categories: ['AI Assistants & Virtual Agents'],
    doFollow: true,
  },
  {
    id: 'toolify',
    name: 'Toolify',
    url: 'https://www.toolify.ai',
    dr: 61,
    traffic: '540K',
    categories: ['AI Assistants & Virtual Agents', 'Technology & Software'],
    doFollow: true,
  },
  {
    id: 'topai-tools',
    name: 'TopAI.tools',
    url: 'https://topai.tools',
    dr: 58,
    traffic: '420K',
    categories: ['AI Assistants & Virtual Agents'],
    doFollow: true,
  },
  {
    id: 'hacker-news',
    name: 'Hacker News (Show HN)',
    url: 'https://news.ycombinator.com',
    dr: 91,
    traffic: '15.4M',
    categories: ['Technology & Software', 'Media & Community'],
    doFollow: false,
  },
  {
    id: 'betalist',
    name: 'BetaList',
    url: 'https://betalist.com',
    dr: 73,
    traffic: '210K',
    categories: ['Technology & Software', 'Media & Community'],
    doFollow: true,
  },
  {
    id: 'startupbase',
    name: 'StartupBase',
    url: 'https://startupbase.io',
    dr: 48,
    traffic: '62K',
    categories: ['Technology & Software', 'Business & B2B Solutions'],
    doFollow: true,
  },
  {
    id: 'launching-next',
    name: 'Launching Next',
    url: 'https://www.launchingnext.com',
    dr: 52,
    traffic: '45K',
    categories: ['Technology & Software', 'Media & Community'],
    doFollow: true,
  },
  {
    id: 'saas-hub',
    name: 'SaaS Hub',
    url: 'https://www.saashub.com',
    dr: 64,
    traffic: '380K',
    categories: ['Technology & Software', 'Business & B2B Solutions'],
    doFollow: true,
  },

  // ── Business / B2B ─────────────────────────────────────────────────────────
  {
    id: 'wellfound',
    name: 'Wellfound (AngelList)',
    url: 'https://wellfound.com',
    dr: 89,
    traffic: '3.4M',
    categories: ['Business & B2B Solutions', 'Technology & Software', 'HR & Future of Work'],
    doFollow: false,
  },
  {
    id: 'clutch',
    name: 'Clutch',
    url: 'https://clutch.co',
    dr: 81,
    traffic: '1.8M',
    categories: ['Business & B2B Solutions', 'Marketing, SEO & Content'],
    doFollow: true,
  },
  {
    id: 'good-firms',
    name: 'GoodFirms',
    url: 'https://www.goodfirms.co',
    dr: 76,
    traffic: '560K',
    categories: ['Business & B2B Solutions', 'Technology & Software'],
    doFollow: true,
  },
  {
    id: 'trustpilot',
    name: 'Trustpilot',
    url: 'https://www.trustpilot.com',
    dr: 93,
    traffic: '39.2M',
    categories: ['Business & B2B Solutions', 'E-commerce & Marketplaces'],
    doFollow: false,
  },
  {
    id: 'trustradius',
    name: 'TrustRadius',
    url: 'https://www.trustradius.com',
    dr: 79,
    traffic: '820K',
    categories: ['Technology & Software', 'Business & B2B Solutions'],
    doFollow: true,
  },
  {
    id: 'f6s',
    name: 'F6S',
    url: 'https://www.f6s.com',
    dr: 74,
    traffic: '480K',
    categories: ['Business & B2B Solutions', 'Technology & Software'],
    doFollow: true,
  },

  // ── Marketing ──────────────────────────────────────────────────────────────
  {
    id: 'appsumo',
    name: 'AppSumo',
    url: 'https://appsumo.com',
    dr: 87,
    traffic: '4.6M',
    categories: ['Marketing, SEO & Content', 'Technology & Software', 'Business & B2B Solutions'],
    doFollow: true,
  },
  {
    id: 'indiehackers',
    name: 'Indie Hackers',
    url: 'https://www.indiehackers.com',
    dr: 82,
    traffic: '1.2M',
    categories: ['Media & Community', 'Technology & Software', 'Business & B2B Solutions'],
    doFollow: true,
  },
  {
    id: 'dev-hunt',
    name: 'DevHunt',
    url: 'https://devhunt.org',
    dr: 44,
    traffic: '38K',
    categories: ['Technology & Software', 'Media & Community'],
    doFollow: true,
  },

  // ── Finance / FinTech ──────────────────────────────────────────────────────
  {
    id: 'fintech-weekly',
    name: 'FinTech Weekly',
    url: 'https://www.fintechweekly.com',
    dr: 58,
    traffic: '92K',
    categories: ['Finance, FinTech & Crypto'],
    doFollow: true,
  },
  {
    id: 'fintech-global',
    name: 'FinTech Global',
    url: 'https://fintech.global',
    dr: 55,
    traffic: '74K',
    categories: ['Finance, FinTech & Crypto', 'Business & B2B Solutions'],
    doFollow: true,
  },

  // ── HR / Future of Work ────────────────────────────────────────────────────
  {
    id: 'software-advice',
    name: 'Software Advice',
    url: 'https://www.softwareadvice.com',
    dr: 86,
    traffic: '1.4M',
    categories: ['HR & Future of Work', 'Business & B2B Solutions', 'Technology & Software'],
    doFollow: true,
  },

  // ── EdTech ─────────────────────────────────────────────────────────────────
  {
    id: 'elearning-industry',
    name: 'eLearning Industry',
    url: 'https://elearningindustry.com',
    dr: 77,
    traffic: '620K',
    categories: ['EdTech & Learning', 'HR & Future of Work'],
    doFollow: true,
  },

  // ── Health ─────────────────────────────────────────────────────────────────
  {
    id: 'healthtech-magazine',
    name: 'HealthTech Magazine',
    url: 'https://healthtechmagazine.net',
    dr: 56,
    traffic: '110K',
    categories: ['HealthTech & Wellness', 'Technology & Software'],
    doFollow: true,
  },

  // ── Cybersecurity ──────────────────────────────────────────────────────────
  {
    id: 'cybersecurity-ventures',
    name: 'Cybersecurity Ventures',
    url: 'https://cybersecurityventures.com',
    dr: 69,
    traffic: '240K',
    categories: ['Cybersecurity & Privacy', 'Technology & Software'],
    doFollow: true,
  },

  // ── General Web Directories ────────────────────────────────────────────────
  {
    id: 'dmoz',
    name: 'DMOZ / Curlie',
    url: 'https://curlie.org',
    dr: 87,
    traffic: '1.6M',
    categories: ['Directories & Aggregators'],
    doFollow: true,
  },
  {
    id: 'about-us',
    name: 'AboutUs',
    url: 'https://www.aboutus.com',
    dr: 61,
    traffic: '120K',
    categories: ['Directories & Aggregators', 'Business & B2B Solutions'],
    doFollow: true,
  },
  {
    id: 'manta',
    name: 'Manta',
    url: 'https://www.manta.com',
    dr: 75,
    traffic: '780K',
    categories: ['Directories & Aggregators', 'Business & B2B Solutions'],
    doFollow: true,
  },
  {
    id: 'yelp',
    name: 'Yelp',
    url: 'https://www.yelp.com',
    dr: 93,
    traffic: '62.4M',
    categories: ['Directories & Aggregators', 'E-commerce & Marketplaces'],
    doFollow: false,
  },
  {
    id: 'bbb',
    name: 'Better Business Bureau',
    url: 'https://www.bbb.org',
    dr: 91,
    traffic: '8.1M',
    categories: ['Directories & Aggregators', 'Business & B2B Solutions'],
    doFollow: true,
  },
]

export function getDirectories(opts: {
  search?: string
  category?: string
} = {}): Directory[] {
  let list = [...DIRECTORIES]

  if (opts.category) {
    list = list.filter(d => d.categories.includes(opts.category as Category))
  }

  if (opts.search) {
    const q = opts.search.toLowerCase()
    list = list.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.categories.some(c => c.toLowerCase().includes(q)) ||
      d.url.toLowerCase().includes(q)
    )
  }

  return list.sort((a, b) => b.dr - a.dr)
}
