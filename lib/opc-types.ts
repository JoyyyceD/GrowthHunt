// Database row shapes (snake_case, matches Postgres columns)

export type ChampionRow = {
  id: string
  slug: string
  name: string
  by_name: string | null
  founder_type: string | null
  tagline: string
  about: string | null
  url: string | null
  category: string | null
  hue: string | null
  logo_url: string | null
  image1_url: string | null
  image2_url: string | null
  status: 'live' | 'soon' | 'archived'
  featured: boolean
  source: 'user' | 'editorial' | 'producthunt'
  owner_id: string | null
  upvote_count: number
  comment_count: number
  created_at: string
  deleted_at: string | null
}

export type ProfileRow = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  twitter: string | null
  bio: string | null
  site: string | null
  created_at: string
}

export type CommentRow = {
  id: string
  champion_id: string
  author_id: string | null
  body: string
  created_at: string
}

// Frontend-facing shapes (matches the mock STORE.* shapes used in opchampion.jsx)

export type ChampionDTO = {
  id: string                  // slug — the LOGOS lookup key in JSX
  uuid: string                // DB primary key — used for mutations
  name: string
  by: string | null
  founderType: string | null
  category: string | null
  tagline: string
  about: string | null
  url: string | null
  hue: string | null
  logoUrl: string | null
  image1Url: string | null
  image2Url: string | null
  status: 'Live' | 'Soon' | 'Archived'  // capitalized for frontend display
  featured: boolean
  source: 'user' | 'editorial' | 'producthunt'
  ownerId: string | null
  upvotes: number
  comments: number          // count, not array
  submittedAt: number       // epoch ms
}

export type CommentDTO = {
  id: string
  body: string
  createdAt: number
  author: {
    id: string | null
    name: string | null
    email: string | null
    avatar: string | null
  }
}

export type MeDTO = {
  id: string
  email: string | null
  name: string | null     // display_name → name (frontend convention)
  avatar: string | null
  bio: string | null
  twitter: string | null
  site: string | null
  initials: string         // computed from name
}
