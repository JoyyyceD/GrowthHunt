import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GrowthHunt — Your all-in-one go-to-market agent',
  description: 'Find the creators your buyers already trust, write the pitch, send it, track the reply, and learn which pattern actually converts. One agent. Every channel.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
