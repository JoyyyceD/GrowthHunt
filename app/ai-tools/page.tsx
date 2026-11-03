import Link from 'next/link'
import { tools, softwareCategories } from '@/lib/editorial'
import { editorialMetadata, collectionSchema, newestContentDate, pageContentModified } from '@/lib/editorial-seo'
import { StructuredData } from '@/lib/site/StructuredData'
import { EditorialFrame, Intro, ToolCard } from '@/lib/site/Editorial'

const title = 'AI Tools & Practical Software Guides'
const description = 'Explore software for documents, video, meetings, AI assistance, and design. Buying guides for individuals, creators, and small teams.'
export const metadata = editorialMetadata({ title, description, path: '/ai-tools' })

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams
  const selected = softwareCategories.find(item => item.id === category)
  const visibleTools = selected ? tools.filter(tool => selected.toolSlugs.includes(tool.slug)) : tools

  return (
    <EditorialFrame>
      <StructuredData data={collectionSchema({
        path: '/ai-tools', title: selected?.name ?? title,
        description: selected?.description ?? description,
        items: visibleTools.map(tool => ({ name: tool.name, path: `/ai-tools/${tool.slug}` })),
        modified: newestContentDate([pageContentModified['/ai-tools'], ...visibleTools.map(tool => tool.contentModified)]),
      })} />
      <Intro label="Software guides" title={selected ? selected.name : 'Find a tool for what you do.'}>
        <p>{selected ? selected.description : 'Explore AI tools and practical software for work, creativity, and everyday projects. Start with a task, then compare the fit and check the current details.'}</p>
      </Intro>
      <nav className="gh-category-filters" aria-label="Software categories">
        <Link href="/ai-tools" aria-current={!selected ? 'page' : undefined}>All software</Link>
        {softwareCategories.map(item => <Link href={`/ai-tools?category=${item.id}`} key={item.id} aria-current={selected?.id === item.id ? 'page' : undefined}>{item.name}</Link>)}
      </nav>
      <p className="gh-section-note">These introductions are based on official product sources. They are not hands-on reviews or measured performance comparisons.</p>
      <div className="gh-grid">{visibleTools.map(tool => <div id={tool.slug} key={tool.slug}><ToolCard tool={tool} /></div>)}</div>
    </EditorialFrame>
  )
}
