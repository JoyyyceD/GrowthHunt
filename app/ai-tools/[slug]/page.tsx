import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { tools, getTool, guides } from '@/lib/editorial'
import { EditorialFrame, Intro, ToolCTA } from '@/lib/site/Editorial'
export function generateStaticParams() { return tools.map(({ slug }) => ({ slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const tool = getTool(slug); if (!tool) return {}
  return { title: `${tool.name}: Uses, Fit & Buying Checklist`, description: tool.summary, alternates: { canonical: `https://growthhunt.ai/ai-tools/${slug}` } }
}
export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const tool = getTool(slug); if (!tool) notFound()
  const related = guides.filter(guide => guide.toolSlugs.includes(slug))
  return <EditorialFrame><nav className="gh-breadcrumb" aria-label="Breadcrumb"><Link href="/ai-tools">AI Tools</Link> / {tool.name}</nav><Intro label={tool.category} title={tool.name}><p>{tool.task}.</p></Intro><div className="gh-article-layout"><article className="gh-prose"><p className="gh-evidence">Official-source overview · Not a hands-on review<br />Sources checked <time dateTime={tool.sourceChecked}>November 2, 2026</time> · By GrowthHunt Editorial</p><h2>What it does</h2><p>{tool.summary}</p><h2>Who should consider it</h2><p>{tool.fit}</p><h2>When to skip it</h2><p>{tool.skip}</p><h2>What to check before buying</h2><ol>{tool.considerations.map(item => <li key={item}>{item}</li>)}</ol><h2>Pricing and sources</h2><p>We link to the vendor rather than quote a price that may depend on location, platform, plan, or billing period. Confirm the total and renewal terms before purchasing.</p><ul><li><a className="gh-text-link" href={tool.website} target="_blank" rel="noopener noreferrer">Official product information ↗</a></li><li><a className="gh-text-link" href={tool.pricing} target="_blank" rel="noopener noreferrer">Vendor pricing and purchase options ↗</a></li></ul><h2>Limits of this overview</h2><p>This profile uses public product documentation. It does not establish real-world accuracy, performance, or business results. Our buying considerations are editorial analysis, not measured product scores.</p>{related.length > 0 && <><h2>Related selection guide</h2>{related.map(guide => <p key={guide.slug}><Link className="gh-text-link" href={`/guides/${guide.slug}`}>{guide.title} →</Link></p>)}</>}<p><Link className="gh-text-link" href="/growth-story">Explore startup growth stories →</Link></p></article><aside className="gh-buy-box"><span className="eyebrow">Next step</span><h2>Check the official details.</h2><p>Review the plan and product fit before making a purchase.</p><ToolCTA tool={tool} /></aside></div></EditorialFrame>
}
