import Link from 'next/link'
import { notFound } from 'next/navigation'
import { guides, tools } from '@/lib/editorial'
import { editorialMetadata, editorialArticleSchema, displayContentDate } from '@/lib/editorial-seo'
import { EditorialFrame, Intro, ToolCTA } from '@/lib/site/Editorial'
import { Breadcrumbs, StructuredData } from '@/lib/site/StructuredData'

type Props = { params: Promise<{ slug: string }> }
export function generateStaticParams() { return guides.map(({ slug }) => ({ slug })) }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const guide = guides.find(item => item.slug === slug)
  return guide ? editorialMetadata({ title: guide.title, description: guide.description, path: `/guides/${slug}`, article: true, modified: guide.contentModified }) : {}
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const guide = guides.find(item => item.slug === slug)
  if (!guide) notFound()
  const path = `/guides/${slug}`
  const breadcrumbs = [{ name: 'Home', path: '/' }, { name: 'Buying Guides', path: '/guides' }, { name: guide.title, path }]
  const schema = editorialArticleSchema({ path, title: guide.title, description: guide.description, modified: guide.contentModified, prepared: guide.preparedAt, breadcrumbs })

  return (
    <EditorialFrame>
      <StructuredData data={schema} />
      <Breadcrumbs items={breadcrumbs} />
      <Intro label="Buying checklist" title={guide.title}><p>{guide.description}</p></Intro>
      <article className="gh-prose">
        <p className="gh-evidence">
          By <Link href="/about">GrowthHunt</Link> · Prepared <time dateTime={guide.preparedAt}>{displayContentDate(guide.preparedAt)}</time><br />
          Content updated <time dateTime={guide.contentModified}>{displayContentDate(guide.contentModified)}</time><br />
          Editorial selection framework · Not a hands-on product test
        </p>
        {guide.sections.map(section => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
        <h2>Explore a tool for this workflow</h2>
        {tools.filter(tool => guide.toolSlugs.includes(tool.slug)).map(tool => <section key={tool.slug}><h3><Link className="gh-text-link" href={`/ai-tools/${tool.slug}`}>{tool.name}: fit, limitations, and sources →</Link></h3><ToolCTA tool={tool} /></section>)}
        <p><Link className="gh-text-link" href="/editorial-policy">How we research and label our content →</Link></p>
      </article>
    </EditorialFrame>
  )
}
