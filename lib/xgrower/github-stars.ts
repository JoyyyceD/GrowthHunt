/**
 * Fetch the live GitHub star count for the X Grower extension repo.
 *
 * Cached at the Next.js fetch layer for 30 minutes — landing page traffic
 * shouldn't burn the unauthenticated GitHub rate limit (60 req/hr), and a
 * star count that's stale by 30 min is fine. Set GITHUB_TOKEN for headroom.
 */

const REPO = 'JoyyyceD/xgrower-extension'

export interface GithubStars {
  stars: number
  url: string
  source: 'live' | 'fallback'
}

const FALLBACK: GithubStars = {
  stars: 0,
  url: `https://github.com/${REPO}`,
  source: 'fallback',
}

export async function fetchGithubStars(): Promise<GithubStars> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'growthhunt-xgrower',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers,
      next: { revalidate: 60 * 30 },
    })
    if (!res.ok) return FALLBACK

    const json = (await res.json()) as { stargazers_count?: number; html_url?: string }
    const stars = typeof json.stargazers_count === 'number' ? json.stargazers_count : null
    if (stars === null || stars < 0) return FALLBACK

    return { stars, url: json.html_url || FALLBACK.url, source: 'live' }
  } catch {
    return FALLBACK
  }
}
