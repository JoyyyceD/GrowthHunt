import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/opchampion', destination: '/picolaunch', permanent: true },
      { source: '/opchampion/:slug*', destination: '/picolaunch/:slug*', permanent: true },
      { source: '/OPChampion', destination: '/picolaunch', permanent: true },
      { source: '/OPChampion/:slug*', destination: '/picolaunch/:slug*', permanent: true },
    ]
  },
}

export default nextConfig
