import Link from 'next/link'
import type { Metadata } from 'next'
import { tools, guides, softwareCategories } from '@/lib/editorial'
import { TopNav } from '@/lib/site/TopNav'
import { ToolCard } from '@/lib/site/Editorial'

const title = 'GrowthHunt — Find software for work and creativity'
const description = 'Discover AI tools and practical software for documents, video, meetings, design, and everyday work. Clear buying guides for individuals, creators, and small teams.'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: 'https://growthhunt.ai' },
  openGraph: { title, description, url: 'https://growthhunt.ai' },
  twitter: { title, description },
}

export default function HomePage() {
  return (
    <>
      <TopNav variant="home" />
      <main id="main-content" className="gh-editorial">
        <section className="shell gh-home-hero gh-software-hero">
          <div>
            <div className="eyebrow"><span className="dot" />AI and software, made practical</div>
            <h1>Find software for<br /><em>work and creativity.</em></h1>
            <p className="gh-lede">
              For the documents you need to finish, the videos you want to make,
              and the ideas you want to bring to life. Discover tools, understand
              the tradeoffs, and choose what fits you.
            </p>
            <div className="gh-actions">
              <Link className="gh-button" href="/ai-tools">Explore software <span aria-hidden="true">↗</span></Link>
              <Link className="gh-text-link" href="/guides">Read buying guides <span aria-hidden="true">→</span></Link>
            </div>
            <p className="gh-audience">For individuals, creators, and small teams.</p>
          </div>
          <aside className="gh-index gh-starting-points" aria-label="Software starting points">
            <div className="eyebrow">What are you working on?</div>
            <Link href="/ai-tools?category=office">
              <span aria-hidden="true">01</span>
              <div>Get your documents in order<small>Office suites, presentations, and PDF tools</small></div>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/ai-tools?category=video">
              <span aria-hidden="true">02</span>
              <div>Make something worth watching<small>Video editing and content creation</small></div>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/ai-tools?category=design">
              <span aria-hidden="true">03</span>
              <div>Bring a space to life<small>Interior design and 3D visualization</small></div>
              <span aria-hidden="true">↗</span>
            </Link>
          </aside>
        </section>

        <section id="categories" className="gh-category-section" aria-labelledby="categories-heading">
          <div className="shell">
            <div className="gh-section-head">
              <div>
                <div className="eyebrow">Find your starting point</div>
                <h2 id="categories-heading">What do you want to do?</h2>
              </div>
              <Link className="gh-text-link" href="/ai-tools">Browse all software <span aria-hidden="true">→</span></Link>
            </div>
            <div className="gh-category-grid">
              {softwareCategories.map((category, index) => (
                <Link className="gh-category" href={`/ai-tools?category=${category.id}`} key={category.id}>
                  <div className="gh-category-top"><span className="gh-category-number">0{index + 1}</span><span aria-hidden="true">↗</span></div>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                  <span className="gh-category-examples">{category.examples}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="shell gh-section">
          <div className="gh-section-head">
            <div><div className="eyebrow">Software to explore</div><h2>Meet your next useful tool.</h2></div>
            <Link className="gh-text-link" href="/ai-tools">See all tool guides <span aria-hidden="true">→</span></Link>
          </div>
          <p className="gh-section-note">What it does, who it suits, and what to check before buying. These introductions use official sources and are labeled separately from hands-on reviews.</p>
          <div className="gh-grid">{tools.map(tool => <ToolCard key={tool.slug} tool={tool} />)}</div>
        </section>

        <section className="shell gh-section">
          <div className="gh-section-head">
            <div><div className="eyebrow">Buying guides</div><h2>A little clarity before you commit.</h2></div>
            <Link className="gh-text-link" href="/guides">All buying guides <span aria-hidden="true">→</span></Link>
          </div>
          <div className="gh-guide-grid">
            {guides.map(guide => (
              <article key={guide.slug} className="gh-guide">
                <div className="eyebrow">Selection checklist</div>
                <h3><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h3>
                <p>{guide.description}</p>
                <Link className="gh-text-link" href={`/guides/${guide.slug}`}>Read the guide <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="gh-choice-section" aria-labelledby="choice-heading">
          <div className="shell">
            <div className="eyebrow">The GrowthHunt approach</div>
            <h2 id="choice-heading">A useful choice starts with context.</h2>
            <div className="gh-choice-grid">
              <div><h3>Start with the job.</h3><p>A tool should fit the work you need to do. Our guides explain the use case, the intended audience, and when a simpler option may be enough.</p></div>
              <div><h3>Know the basis.</h3><p>Official product information and hands-on experience are different kinds of evidence. Our content labels tell you what a guide is based on.</p></div>
              <div><h3>Check the details.</h3><p>Plans and features change. Follow our source links to confirm the current price, limits, and purchase conditions with the provider.</p></div>
            </div>
            <Link className="gh-text-link" href="/editorial-policy">How we cover software <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section className="shell gh-section gh-research-section">
          <div><div className="eyebrow">From the archive</div><h2>Curious how software companies grow?</h2><p>Explore our existing startup stories and research, reconstructed from public sources.</p></div>
          <div className="gh-actions"><Link className="gh-text-link" href="/growth-story">Growth stories <span aria-hidden="true">→</span></Link><Link className="gh-text-link" href="/blog">Research and articles <span aria-hidden="true">→</span></Link></div>
        </section>
        <div className="shell gh-home-disclosure">Some links may earn GrowthHunt a commission on qualifying purchases. Commercial links are disclosed near the link. <Link href="/affiliate-disclosure">Read our affiliate disclosure.</Link></div>
      </main>
    </>
  )
}
