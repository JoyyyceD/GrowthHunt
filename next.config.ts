import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/OPChampion', destination: '/OPChampion/index.html' },
    ]
  },
}

export default nextConfig
