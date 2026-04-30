import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect the legacy case-sensitive URL to the canonical lowercase path
      { source: '/OPChampion', destination: '/opchampion', permanent: true },
    ]
  },
  async rewrites() {
    // Flat array = afterFiles: runs after App Router pages.
    // /opchampion has no page.tsx, so the rewrite serves the static SPA.
    // /opchampion/[slug] has a page.tsx and is NOT rewritten — App Router handles it.
    return [
      { source: '/opchampion', destination: '/OPChampion/index.html' },
    ]
  },
}

export default nextConfig
