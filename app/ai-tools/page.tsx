import type { Metadata } from 'next'
import { tools } from '@/lib/editorial'
import { EditorialFrame, Intro, ToolCard } from '@/lib/site/Editorial'
export const metadata: Metadata = { title: 'AI Tools & Software Guides', description: 'A focused collection of software overviews for founders and lean teams.', alternates: { canonical: 'https://growthhunt.ai/ai-tools' } }
export default function ToolsPage() { return <EditorialFrame><Intro label="AI Tools" title="Choose a tool for the work ahead."><p>A focused collection of AI and productivity software. Start with your task, then check features, fit, and current vendor pricing. These profiles are documentation-based overviews, not hands-on reviews.</p></Intro><div className="gh-grid">{tools.map(tool => <div id={tool.slug} key={tool.slug}><ToolCard tool={tool} /></div>)}</div></EditorialFrame> }
