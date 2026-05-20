// GitHub Search API client for the Velocity tracker.
// Fetches "breakout" repos — repos created in the last 90 days, sorted by
// stars. Because every result is at most 90 days old, stars-per-day-since-
// creation is a fair velocity signal computable from a single snapshot.

import type { RepoFetch } from './types'

// Word-boundary matched so short tokens (ai, ml, rag) don't match inside
// unrelated words like "email", "training", "domain".
const AI_RE =
  /\b(a\.?i\.?|artificial-intelligence|llms?|gpts?|chatgpt|agent(?:ic|s)?|rag|ml|ai-?powered|chatbots?|copilots?|gen-?ai|generative|claude|openai|anthropic|deepseek|gemini|mistral|qwen|llama|mcp|embeddings?|multimodal|langchain|comfyui|whisper|diffusion|transformers?|neural|inference|fine-?tun\w*|prompt-?\w*|text-to-\w+|speech-to-\w+|machine-?learning|deep-?learning|stable-?diffusion|voice-?ai)\b/i

function looksAI(name: string, description: string | null, topics: string[]): boolean {
  return AI_RE.test(`${name} ${description ?? ''} ${topics.join(' ')}`.toLowerCase())
}

interface GithubApiRepo {
  full_name?: string
  name?: string
  owner?: { login?: string; avatar_url?: string; html_url?: string } | null
  description?: string | null
  language?: string | null
  topics?: string[]
  html_url?: string
  homepage?: string | null
  stargazers_count?: number
  forks_count?: number
  open_issues_count?: number
  created_at?: string
  pushed_at?: string | null
}

function mapRepo(r: GithubApiRepo): RepoFetch {
  const topics = Array.isArray(r.topics) ? r.topics : []
  const fullName = r.full_name!
  return {
    id: fullName.toLowerCase(),
    full_name: fullName,
    name: r.name ?? fullName.split('/')[1] ?? fullName,
    owner: r.owner?.login ?? fullName.split('/')[0],
    owner_avatar: r.owner?.avatar_url ?? null,
    owner_url: r.owner?.html_url ?? null,
    description: r.description ?? null,
    language: r.language ?? null,
    topics,
    html_url: r.html_url ?? `https://github.com/${fullName}`,
    homepage: r.homepage && r.homepage.trim() ? r.homepage.trim() : null,
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    open_issues: r.open_issues_count ?? 0,
    repo_created_at: r.created_at ?? new Date().toISOString(),
    repo_pushed_at: r.pushed_at ?? null,
    is_ai: looksAI(r.name ?? fullName, r.description ?? null, topics),
  }
}

/**
 * Fetch breakout repos. Runs a few GitHub Search queries and dedupes.
 * Works unauthenticated; set GITHUB_TOKEN to raise the rate limit.
 * Throws only if every query failed.
 */
export async function fetchBreakoutRepos(): Promise<RepoFetch[]> {
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'growthhunt-velocity',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

  const queries = [
    `created:>${since} stars:>80`,
    `created:>${since} stars:>25 topic:ai`,
    `created:>${since} stars:>25 topic:llm`,
  ]

  const seen = new Map<string, RepoFetch>()
  const errors: string[] = []

  for (let i = 0; i < queries.length; i++) {
    const url =
      `https://api.github.com/search/repositories` +
      `?q=${encodeURIComponent(queries[i])}&sort=stars&order=desc&per_page=100`
    try {
      const res = await fetch(url, { headers, cache: 'no-store' })
      if (!res.ok) {
        errors.push(`q${i}: HTTP ${res.status}`)
      } else {
        const data = (await res.json()) as { items?: GithubApiRepo[] }
        for (const item of data.items ?? []) {
          if (!item?.full_name) continue
          const row = mapRepo(item)
          const existing = seen.get(row.id)
          if (!existing || row.stars > existing.stars) seen.set(row.id, row)
        }
      }
    } catch (e) {
      errors.push(`q${i}: ${e instanceof Error ? e.message : String(e)}`)
    }
    if (i < queries.length - 1) await new Promise(r => setTimeout(r, 2500))
  }

  if (seen.size === 0) {
    throw new Error(`GitHub fetch failed: ${errors.join('; ') || 'no results'}`)
  }
  return [...seen.values()]
}
