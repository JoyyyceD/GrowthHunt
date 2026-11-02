import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { guides, tools } from '@/lib/editorial'
import { EditorialFrame, Intro, ToolCTA } from '@/lib/site/Editorial'
export function generateStaticParams() { return guides.map(({ slug }) => ({ slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const guide = guides.find(g => g.slug === slug); return guide ? { title: guide.title, description: guide.description, alternates: { canonical: `https://growthhunt.ai/guides/${slug}` } } : {} }
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const guide = guides.find(g => g.slug === slug); if (!guide) notFound()
  return <EditorialFrame><nav aria-label="Breadcrumb" className="gh-breadcrumb"><Link href="/guides">Selection Guides</Link> / Buying checklist</nav><Intro label="Buying checklist" title={guide.title}><p>{guide.description}</p></Intro><article className="gh-prose"><p className="gh-evidence">By GrowthHunt Editorial · Prepared November 2, 2026<br />Editorial selection framework · Not a hands-on product test</p>{guide.sections.map(section => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}<h2>Explore a tool for this workflow</h2>{tools.filter(tool => guide.toolSlugs.includes(tool.slug)).map(tool => <section key={tool.slug}><h3><Link className="gh-text-link" href={`/ai-tools/${tool.slug}`}>{tool.name}: fit, limitations, and sources →</Link></h3><ToolCTA tool={tool} /></section>)}<p><Link className="gh-text-link" href="/editorial-policy">How we research and label our content →</Link></p></article></EditorialFrame>
}
