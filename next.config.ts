import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    // /opchampion has no page.tsx — this rewrite serves the static SPA.
    // /opchampion/[slug] has a page.tsx, so App Router handles it (rewrite doesn't match).
    return [
      { source: '/opchampion', destination: '/OPChampion/index.html' },
    ]
  },
}

export default nextConfig
