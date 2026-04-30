import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

const BASE = 'https://growthhunt.ai'
const TITLE = 'GrowthHunt — Your all-in-one go-to-market agent'
const DESCRIPTION = 'Find the creators your buyers already trust, write the pitch, send it, track the reply, and learn which pattern actually converts. One agent. Every channel.'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: TITLE,
    template: '%s — GrowthHunt',
  },
  description: DESCRIPTION,
  keywords: [
    'go to market', 'GTM agent', 'creator discovery', 'influencer outreach',
    'Reddit marketing', 'YouTube creator', 'cold email automation',
    'indie hacker', 'SaaS growth', 'startup marketing', 'growth tool',
  ],
  authors: [{ name: 'GrowthHunt Labs' }],
  creator: 'GrowthHunt Labs',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE,
    siteName: 'GrowthHunt',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    creator: '@growthhuntai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: BASE,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'GrowthHunt',
  url: BASE,
  description: DESCRIPTION,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/OnlineOnly',
  },
  publisher: {
    '@type': 'Organization',
    name: 'GrowthHunt Labs',
    url: BASE,
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-MG4MDHT7RZ" strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-MG4MDHT7RZ');
        `}</Script>
      </body>
    </html>
  )
}
