import Link from 'next/link'
import { editorialMetadata } from '@/lib/editorial-seo'
import { EditorialFrame, Intro } from '@/lib/site/Editorial'

export const metadata = editorialMetadata({ title: 'Terms', description: 'Terms for GrowthHunt editorial content, optional products, and links to third-party software.', path: '/terms' })

export default function TermsPage() {
  return <EditorialFrame>
    <Intro label="Terms" title="Using GrowthHunt." />
    <article className="gh-prose">
      <p className="gh-evidence">Last updated <time dateTime="2026-11-03">November 3, 2026</time></p>
      <p>These terms cover your use of GrowthHunt’s website, editorial content, and optional product features. By using the service, you agree to these terms. Contact <a className="gh-text-link" href="mailto:hi@growthhunt.ai">hi@growthhunt.ai</a> with questions.</p>
      <h2>Content and purpose</h2>
      <p>GrowthHunt publishes software information, selection guides, and growth research. Content is general information to support your evaluation. A profile or guide does not guarantee that a product is suitable for a specific situation or will produce a particular result.</p>
      <h2>Product information</h2>
      <p>Vendor features, availability, plans, and prices can change. Check the merchant’s current information before purchasing. A source-check date records when the cited information was reviewed; it does not promise that every subsequent vendor change is already reflected here. Documentation-based overviews are labeled and do not imply hands-on testing.</p>
      <h2>Third-party purchases and commercial links</h2>
      <p>Third-party software is provided by its merchant. Purchase terms, billing, refunds, and support for that purchase are governed by your agreement with the merchant. An outbound link does not mean that GrowthHunt is the merchant or an authorized representative.</p>
      <p>Some links may generate commission for GrowthHunt. See the <Link className="gh-text-link" href="/affiliate-disclosure">affiliate disclosure</Link>. No cashback or reward is promised to visitors.</p>
      <h2>Accounts, products, and submissions</h2>
      <p>You must be at least 13 years old to use account and submission features. If you submit on behalf of a company, you must have authority to do so. Keep your account access secure and submit only content you own or have permission to use.</p>
      <p>You retain ownership of your submissions. By publishing them through GrowthHunt, you grant GrowthHunt a non-exclusive, worldwide, royalty-free permission to host, display, and reproduce that content as needed to operate the service. Do not post illegal or abusive content, impersonate others, distribute malware, manipulate votes, or materially burden the service. We may remove content or accounts that violate these terms.</p>
      <p>Any plan, billing, cancellation, or refund terms presented for a paid GrowthHunt product apply to that purchase. This website update does not alter an existing purchase agreement. Third-party platform rules also apply when you connect or use those platforms.</p>
      <h2>Content rights and availability</h2>
      <p>GrowthHunt’s original site content and branding remain the property of GrowthHunt; third-party names, trademarks, and materials belong to their respective owners. The service is provided as available, without a guarantee of uptime, data durability, traffic, or business results. Keep your own copies of important information. Nothing in these terms excludes rights or obligations that cannot be excluded under applicable law.</p>
      <h2>Changes and questions</h2>
      <p>We may update these terms and record the revision date above. Contact us first to discuss a problem with the service. See the <Link className="gh-text-link" href="/privacy">privacy page</Link> for information handling, or <Link className="gh-text-link" href="/contact">contact GrowthHunt</Link> with questions or corrections.</p>
    </article>
  </EditorialFrame>
}
