import type { Metadata } from 'next'
import Script from 'next/script'
import { Toaster } from 'sonner'
import FollowFelixWidget from '@/components/FollowFelixWidget'
import { FloatingChatGate } from '@/components/FloatingChatGate'
import './globals.css'

const BASE = 'https://growthhunt.ai'
const TITLE = 'GrowthHunt — How one AI agent runs your full go-to-market'
const DESCRIPTION = 'GrowthHunt is the all-in-one AI go-to-market agent for indie founders: finds creators, writes pitches, tracks replies across X, Reddit & YouTube. 6 free tools, $0 to start.'
const DATE_PUBLISHED = '2025-09-01'
const DATE_MODIFIED = '2026-05-24'

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
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
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

// Separate Organization entity — gives Google a clean signal for brand
// searches (knowledge panel, sitelinks). SoftwareApplication describes
// the product; this describes the company behind it.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GrowthHunt',
  legalName: 'GrowthHunt Labs',
  url: BASE,
  logo: `${BASE}/icon.svg`,
  description: DESCRIPTION,
  sameAs: [
    'https://x.com/growthhuntai',
  ],
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
        <link
          rel="alternate"
          type="application/rss+xml"
          title="GrowthHunt Blog"
          href={`${BASE}/blog/rss.xml`}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body>
        {children}
        <FollowFelixWidget />
        <FloatingChatGate />
        <Toaster position="bottom-left" richColors />
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
