import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect the legacy case-sensitive URL to the canonical lowercase path
      { source: '/OPChampion', destination: '/opchampion', permanent: true },
    ]
  },
  async rewrites() {
    return [
      // OPChampion is served from the static HTML in public/
      { source: '/opchampion', destination: '/OPChampion/index.html' },
      { source: '/opchampion/:path*', destination: '/OPChampion/index.html' },
    ]
  },
}

export default nextConfig
