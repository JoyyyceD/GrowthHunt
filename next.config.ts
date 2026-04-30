import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect the legacy case-sensitive URL to the canonical lowercase path
      { source: '/OPChampion', destination: '/opchampion', permanent: true },
    ]
  },
}

export default nextConfig
