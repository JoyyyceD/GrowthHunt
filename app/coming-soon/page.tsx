import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import ComingSoonClient from './ComingSoonClient'

export const metadata: Metadata = {
  title: 'Coming Soon — the GrowthHunt agent roadmap',
  description: '22 features across research, discovery, outreach, and management — what\'s coming next to GrowthHunt.',
  alternates: { canonical: 'https://growthhunt.ai/coming-soon' },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/coming-soon',
    title: 'Coming Soon — GrowthHunt agent roadmap',
    description: '22 features across research, discovery, outreach, and management.',
  },
}

function Footer() {
  return (
    <footer className="bottom">
      <div className="shell" style={{ display: 'contents' }}>
        <div>
          <div className="big serif">GrowthHunt.</div>
          <div style={{ color: 'var(--ink-dim)', fontSize: 14, maxWidth: 280, lineHeight: 1.55 }}>
            One agent for the entire go-to-market motion. Built for indie founders, growth teams, and out-bound-going-global startups.
          </div>
        </div>
        <div>
          <h4>Modules</h4>
          <ul>
            <li><a href="#research">Research</a></li>
            <li><a href="#discovery">Discovery</a></li>
            <li><a href="#outreach">Outreach</a></li>
            <li><a href="#manage">Manage</a></li>
          </ul>
        </div>
        <div>
          <h4>Live products</h4>
          <ul>
            <li><Link href="/get-backlinks">Get Backlinks</Link></li>
            <li><Link href="/microlaunch">MicroLaunch</Link></li>
            <li><Link href="/viral-sense">Viral Sense</Link></li>
            <li><Link href="/x-templates">X Templates</Link></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a>Manifesto</a></li>
            <li><a>Changelog</a></li>
            <li><a>Twitter / X</a></li>
            <li><a href="mailto:hi@growthhunt.ai">hi@growthhunt.ai</a></li>
          </ul>
        </div>
        <div className="copyright">
          <span>© 2026 GrowthHunt Labs</span>
          <span>Built with care · No tracking · No bullshit</span>
        </div>
      </div>
    </footer>
  )
}

export default function ComingSoonPage() {
  return (
    <div>
      <TopNav variant="page" />
      <ComingSoonClient />
      <Footer />
    </div>
  )
}
