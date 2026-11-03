import Link from 'next/link'
import { guides } from '@/lib/editorial'
import { editorialMetadata, collectionSchema, newestContentDate, pageContentModified } from '@/lib/editorial-seo'
import { StructuredData } from '@/lib/site/StructuredData'
import { EditorialFrame, Intro } from '@/lib/site/Editorial'
const title = 'Software Buying Guides'
const description = 'Practical checklists for choosing software for your work and creative projects.'
export const metadata = editorialMetadata({ title, description, path: '/guides' })
export default function GuidesPage() { return <EditorialFrame><StructuredData data={collectionSchema({ path: '/guides', title, description, items: guides.map(guide => ({ name: guide.title, path: `/guides/${guide.slug}` })), modified: newestContentDate([pageContentModified['/guides'], ...guides.map(guide => guide.contentModified)]) })} /><Intro label="Buying Guides" title="Start with the task, then choose the software."><p>Practical selection criteria for individuals, creators, and small teams. These are buying checklists, not reports of hands-on product tests.</p></Intro><div className="gh-guide-grid">{guides.map(guide => <article className="gh-guide" key={guide.slug}><h2><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2><p>{guide.description}</p><Link className="gh-text-link" href={`/guides/${guide.slug}`}>Read the guide →</Link></article>)}</div></EditorialFrame> }
