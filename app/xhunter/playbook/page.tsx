import { Metadata } from 'next'
import Link from 'next/link'
import PlaybookContent from './PlaybookContent'

export const metadata: Metadata = {
  title: 'Growth Playbook · No. 01: AI Startups on X',
  description:
    'A pattern study of 326 viral tweets across 200+ AI companies. What archetypes win, what plays each stage runs, and what every category-defining account does that the dead ones don\'t.',
  openGraph: {
    title: 'Growth Playbook · No. 01: AI Startups on X — Xhunter',
    description:
      '326 viral tweets analyzed. 5 archetypes. 12-month roadmap. Read the full playbook.',
    type: 'article',
  },
}

export default function PlaybookPage() {
  return (
    <>
      <PlaybookContent />
      <div className="xh-pb-bottom-cta">
        <div className="shell">
          <p className="xh-pb-cta-h">Now go find your <em>own</em> patterns.</p>
          <p className="xh-pb-cta-sub">
            The whole dataset is in the lab — 3,447 tweets, filterable by category, account type, and content tag. Use these starter combinations to find the playbook for your own startup.
          </p>
          <Link href="/xhunter" className="xh-pb-cta-btn">Open the Inspirations Lab →</Link>
        </div>
      </div>
    </>
  )
}
