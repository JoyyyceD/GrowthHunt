import Link from 'next/link'
import type { Metadata } from 'next'
import { EditorialFrame, Intro } from '@/lib/site/Editorial'
export const metadata: Metadata = { title: 'GrowthHunt GTM Products', description: 'Explore GrowthHunt’s own GTM agents and tools.', alternates: { canonical: 'https://growthhunt.ai/products' } }
const products = [
  ['/gtm', 'GTM Mission Control', 'Open the GTM agent workspace.'],
  ['/scout', 'Scout', 'Explore the growth teammate beta.'],
  ['/geo', 'GEO Score', 'Explore the website visibility audit tool.'],
  ['/xgrower', 'X Grower', 'Explore the X workflow product.'],
  ['/velocity', 'Velocity', 'Explore the AI discovery leaderboard.'],
  ['/get-backlinks', 'Get Backlinks', 'Explore the directory-submission service.'],
  ['/picolaunch', 'PicoLaunch', 'Browse the product launch board.'],
  ['/viralx', 'ViralX', 'Explore the social content workflow.'],
]
export default function ProductsPage() { return <EditorialFrame><Intro label="Built by GrowthHunt" title="Our own GTM products."><p>These are GrowthHunt products, separate from the third-party software covered in our editorial guides. Check each product page for access, availability, and current terms.</p></Intro><div className="gh-grid">{products.map(([href,title,text]) => <article className="gh-tool" key={href}><h2 style={{fontSize:30}}>{title}</h2><p>{text}</p><Link className="gh-text-link" href={href}>Explore product →</Link></article>)}</div><p><Link className="gh-text-link" href="/coming-soon">Product roadmap →</Link> · <Link className="gh-text-link" href="/workspace">Existing workspace →</Link></p></EditorialFrame> }
