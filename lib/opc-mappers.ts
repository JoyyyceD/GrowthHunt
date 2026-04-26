import type {
  ChampionRow,
  ChampionDTO,
  CommentRow,
  CommentDTO,
  ProfileRow,
  MeDTO,
} from './opc-types'

const STATUS_MAP: Record<ChampionRow['status'], ChampionDTO['status']> = {
  live: 'Live',
  soon: 'Soon',
  archived: 'Archived',
}

export function championToDTO(row: ChampionRow): ChampionDTO {
  return {
    id: row.slug,
    uuid: row.id,
    name: row.name,
    by: row.by_name,
    founderType: row.founder_type,
    category: row.category,
    tagline: row.tagline,
    about: row.about,
    url: row.url,
    hue: row.hue,
    logoUrl: row.logo_url,
    image1Url: row.image1_url,
    image2Url: row.image2_url,
    status: STATUS_MAP[row.status],
    featured: row.featured,
    source: row.source,
    ownerId: row.owner_id,
    upvotes: row.upvote_count,
    comments: row.comment_count,
    submittedAt: Date.parse(row.created_at),
  }
}

export function commentToDTO(
  row: CommentRow & { author?: ProfileRow | null }
): CommentDTO {
  const a = row.author ?? null
  return {
    id: row.id,
    body: row.body,
    createdAt: Date.parse(row.created_at),
    author: {
      id: a?.id ?? null,
      name: a?.display_name ?? null,
      email: a?.email ?? null,
      avatar: a?.avatar_url ?? null,
    },
  }
}

export function profileToMe(row: ProfileRow): MeDTO {
  const name = row.display_name ?? row.email?.split('@')[0] ?? 'Solo'
  const initials = name
    .split(/[\s.]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return {
    id: row.id,
    email: row.email,
    name,
    avatar: row.avatar_url,
    bio: row.bio,
    twitter: row.twitter,
    site: row.site,
    initials,
  }
}

// HN-style hot score, mirrors the SQL function.  Used when caller wants
// to sort client-side; server-side queries use the `hot_score()` SQL fn.
export function hotScore(upvotes: number, ageHours: number): number {
  return Math.max(0, (upvotes - 1) / Math.pow(ageHours + 2, 1.6))
}

// Slugify a name for new submissions: keep ascii letters/digits, lowercase,
// replace whitespace and punctuation with hyphens.  4-char nanoid suffix
// added by the caller for uniqueness.
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'champion'
}
