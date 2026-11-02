import Link from 'next/link'
import type { Metadata } from 'next'
import { guides } from '@/lib/editorial'
import { EditorialFrame, Intro } from '@/lib/site/Editorial'
export const metadata: Metadata = { title: 'Software Buying Guides', description: 'Practical checklists for choosing software for your work and creative projects.', alternates: { canonical: 'https://growthhunt.ai/guides' } }
export default function GuidesPage() { return <EditorialFrame><Intro label="Buying Guides" title="Start with the task, then choose the software."><p>Practical selection criteria for individuals, creators, and small teams. These are buying checklists, not reports of hands-on product tests.</p></Intro><div className="gh-guide-grid">{guides.map(guide => <article className="gh-guide" key={guide.slug}><h2><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2><p>{guide.description}</p><Link className="gh-text-link" href={`/guides/${guide.slug}`}>Read the guide →</Link></article>)}</div></EditorialFrame> }
