import Link from 'next/link'
import type { ReactNode } from 'react'
import { TopNav } from './TopNav'
import { outbound, type ToolProfile } from '@/lib/editorial'

export function EditorialFrame({ children }: { children: ReactNode }) {
  return <><TopNav /><main id="main-content" className="gh-editorial shell">{children}</main></>
}
export function Intro({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return <header className="gh-intro"><div className="eyebrow">{label}</div><h1>{title}</h1>{children && <div className="gh-lede">{children}</div>}</header>
}
export function ToolCard({ tool }: { tool: ToolProfile }) {
  return <article className="gh-tool"><span className="eyebrow">{tool.category}</span><h3><Link href={`/ai-tools/${tool.slug}`}>{tool.name}</Link></h3><p>{tool.task}.</p><div className="gh-small">Official-source overview · Not a hands-on review</div><Link className="gh-text-link" href={`/ai-tools/${tool.slug}`}>Read the tool guide <span aria-hidden="true">↗</span></Link></article>
}
export function ToolCTA({ tool }: { tool: ToolProfile }) {
  const link = outbound(tool)
  return <div className="gh-outbound"><p className="gh-small">{link.sponsored ? 'Affiliate link: GrowthHunt may earn a commission if you make a qualifying purchase through this link.' : 'This is a direct link to the official website, not an affiliate link.'} <Link href="/affiliate-disclosure">How links work</Link></p><a className="gh-button" href={link.href} rel={link.rel} target="_blank">Visit {tool.name} <span aria-hidden="true">↗</span></a></div>
}
export function EditorialFooter() {
  return <footer className="gh-footer"><div className="shell"><div className="gh-footer-top"><div><Link className="gh-footer-brand" href="/">GrowthHunt.</Link><p>Find software for work and creativity.<br />For individuals, creators, and small teams.</p></div><nav aria-label="Resources"><Link href="/ai-tools">Software</Link><Link href="/guides">Buying Guides</Link><Link href="/growth-story">Growth Stories</Link><Link href="/blog">Blog</Link><a href="/#categories">Software Categories</a></nav><nav aria-label="Company and policies"><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/affiliate-disclosure">Affiliate Disclosure</Link><Link href="/editorial-policy">Editorial Policy</Link></nav></div><div className="gh-footer-bottom"><span>© 2026 GrowthHunt</span><span>Some links may earn us a commission. <Link href="/affiliate-disclosure">Read the disclosure.</Link></span></div></div></footer>
}
