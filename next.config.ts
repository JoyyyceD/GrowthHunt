import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect the legacy case-sensitive URL to the canonical lowercase path
      { source: '/OPChampion', destination: '/opchampion', permanent: true },
    ]
  },
  async rewrites() {
    return {
      // beforeFiles runs before the App Router, so it takes priority over
      // app/opchampion/page.tsx and serves the static HTML directly.
      beforeFiles: [
        { source: '/opchampion', destination: '/OPChampion/index.html' },
        { source: '/opchampion/:path*', destination: '/OPChampion/index.html' },
      ],
    }
  },
}

export default nextConfig
