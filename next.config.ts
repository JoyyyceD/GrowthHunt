import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase storage — covers any project ref under supabase.co
      // (logos and screenshots uploaded via PicoLaunch live here).
      { protocol: 'https', hostname: '*.supabase.co' },
      // Google OAuth profile avatars (PicoLaunch comments)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/opchampion', destination: '/picolaunch', permanent: true },
      { source: '/opchampion/:slug*', destination: '/picolaunch/:slug*', permanent: true },
      { source: '/OPChampion', destination: '/picolaunch', permanent: true },
      { source: '/OPChampion/:slug*', destination: '/picolaunch/:slug*', permanent: true },
      { source: '/account', destination: '/picolaunch/account/launches', permanent: true },
      { source: '/account/:slug*', destination: '/picolaunch/account/:slug*', permanent: true },
    ]
  },
}

export default nextConfig
