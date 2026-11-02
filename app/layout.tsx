import type { Metadata } from 'next'
import Script from 'next/script'
import { Toaster } from 'sonner'
import FollowFelixWidget from '@/components/FollowFelixWidget'
import { FloatingChatGate } from '@/components/FloatingChatGate'
import { ProductOnlyWidgets } from '@/components/ProductOnlyWidgets'
import { EditorialFooter } from '@/lib/site/Editorial'
import './globals.css'

const BASE = 'https://growthhunt.ai'
const TITLE = 'GrowthHunt — Find software for work and creativity'
const DESCRIPTION = 'Discover AI tools and practical software for documents, video, meetings, design, and everyday work. Buying guides for individuals, creators, and small teams.'
const DATE_MODIFIED = '2026-11-02'
const PREVIEW = process.env.GH_REVIEW_PREVIEW === '1'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: TITLE,
    template: '%s — GrowthHunt',
  },
  description: DESCRIPTION,
  keywords: ['software guides', 'AI tools', 'productivity software', 'video editing', 'office software', 'transcription', 'AI assistants', 'interior design software'],
  authors: [{ name: 'GrowthHunt' }],
  creator: 'GrowthHunt',
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
    index: !PREVIEW,
    follow: !PREVIEW,
    googleBot: { index: !PREVIEW, follow: !PREVIEW, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: BASE,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'GrowthHunt',
  url: BASE,
  description: DESCRIPTION,
  dateModified: DATE_MODIFIED,
  publisher: {
    '@type': 'Organization',
    name: 'GrowthHunt',
    url: BASE,
  },
}

// Separate Organization entity — gives Google a clean signal for brand
// searches (knowledge panel, sitelinks). Keep the site and publisher entities separate.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GrowthHunt',
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
        {PREVIEW && <div className="gh-review">Local review preview · Not published · Policy drafts need owner confirmation</div>}
        {children}
        <EditorialFooter />
        {!PREVIEW && <ProductOnlyWidgets><FollowFelixWidget /><FloatingChatGate /></ProductOnlyWidgets>}
        <Toaster position="bottom-left" richColors />
        {!PREVIEW && <><Script src="https://www.googletagmanager.com/gtag/js?id=G-MG4MDHT7RZ" strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-MG4MDHT7RZ');
        `}</Script></>}
      </body>
    </html>
  )
}
