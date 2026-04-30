import { Metadata } from 'next'
import Link from 'next/link'
import PlaybookContent from './PlaybookContent'

export const metadata: Metadata = {
  title: 'Growth Playbook · No. 01: AI Startups on X — ViralX',
  description:
    'A pattern study of viral tweets across 500+ AI founders and startup accounts. What archetypes win, what plays each stage runs, and what every category-defining account does that the dead ones don\'t.',
  openGraph: {
    title: 'Growth Playbook · No. 01: AI Startups on X — ViralX',
    description:
      '5 archetypes. 12-month roadmap. Built from 10,000+ viral tweets. Read the full playbook.',
    type: 'article',
  },
}

export default function PlaybookPage() {
  return (
    <>
      <PlaybookContent />
      <div className="xh-pb-bottom-cta">
        <div className="shell">
          <p className="xh-pb-cta-h">Now go ship your <em>own</em> viral tweets.</p>
          <p className="xh-pb-cta-sub">
            The whole template library is in the lab — 10,000+ viral patterns from 500+ AI founder + startup accounts, filterable by category, account type, and content tag. Pick one, customize it, schedule it, and post it to your own X.
          </p>
          <Link href="/viralx" className="xh-pb-cta-btn">Open ViralX →</Link>
        </div>
      </div>
    </>
  )
}
