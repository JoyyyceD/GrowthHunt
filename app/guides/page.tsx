import Link from 'next/link'
import type { Metadata } from 'next'
import { guides } from '@/lib/editorial'
import { EditorialFrame, Intro } from '@/lib/site/Editorial'
export const metadata: Metadata = { title: 'Software Selection Guides', description: 'Buying checklists for customer research and product content workflows.', alternates: { canonical: 'https://growthhunt.ai/guides' } }
export default function GuidesPage() { return <EditorialFrame><Intro label="Selection Guides" title="Start with the task, then choose the software."><p>Practical selection criteria for founders and lean teams. These are buying checklists, not reports of hands-on product tests.</p></Intro><div className="gh-guide-grid">{guides.map(guide => <article className="gh-guide" key={guide.slug}><h2><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2><p>{guide.description}</p><Link className="gh-text-link" href={`/guides/${guide.slug}`}>Read the guide →</Link></article>)}</div></EditorialFrame> }
