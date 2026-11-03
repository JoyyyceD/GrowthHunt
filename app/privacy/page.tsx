import Link from 'next/link'
import { editorialMetadata } from '@/lib/editorial-seo'
import { EditorialFrame, Intro } from '@/lib/site/Editorial'

export const metadata = editorialMetadata({ title: 'Privacy', description: 'How GrowthHunt handles information when you read content or use optional product features.', path: '/privacy' })

export default function PrivacyPage() {
  return <EditorialFrame>
    <Intro label="Privacy" title="How information is handled." />
    <article className="gh-prose">
      <p className="gh-evidence">Last updated <time dateTime="2026-11-03">November 3, 2026</time></p>
      <p>GrowthHunt operates this website, its software guides, and optional GrowthHunt product features. This page explains the information involved in those activities. Contact <a className="gh-text-link" href="mailto:hi@growthhunt.ai">hi@growthhunt.ai</a> with privacy questions.</p>
      <h2>Reading content and website analytics</h2>
      <p>You can read software profiles, buying guides, and growth research without creating an account. Vercel hosts the website and processes technical request information to deliver and protect it, including network and browser information. Google Analytics 4 measures website use through cookies and usage information, such as pages visited and device or browser details. Your browser settings can restrict cookies.</p>
      <h2>Accounts and optional product features</h2>
      <p>If you create an account, GrowthHunt uses Supabase for authentication and application data. Signing in with Google provides basic account information such as your email, name, and profile image. Product features may store the content you submit, workspace information, settings, and activity needed to provide that feature. Launch submissions, comments, and other content you publish may be visible to other visitors.</p>
      <p>If you choose to connect an external service or use an AI feature, information needed for that task may be processed by the relevant platform or AI provider. The information involved depends on the feature and permissions you choose. Review the applicable provider’s information before submitting confidential material.</p>
      <h2>Messages, subscriptions, and purchases</h2>
      <p>When you contact GrowthHunt, your message and contact details are used to handle the request. Email features use Brevo; subscription forms may also store contact information in Supabase. Use the unsubscribe option in subscription emails to stop receiving those messages.</p>
      <p>Lemon Squeezy handles checkout for applicable GrowthHunt paid subscriptions. Purchases of third-party software take place with the merchant, under that merchant’s terms and privacy information.</p>
      <h2>Cookies and external links</h2>
      <p>Account features use session cookies to keep you signed in. Analytics cookies support the website measurement described above. Following an external link takes you to another website. When an affiliate link is enabled, the merchant or network may use referral identifiers and related technologies to attribute eligible activity. Their own privacy information applies on their services. See our <Link className="gh-text-link" href="/affiliate-disclosure">affiliate disclosure</Link>.</p>
      <h2>Keeping and removing information</h2>
      <p>Account and application information supports the features you use. You can use the editing and removal controls available for your submissions, or contact us about access, correction, export, or deletion. We may need to verify your request to protect account information. Some records may need to be retained for security, transaction records, or applicable obligations; deleting an account does not remove information already held independently by a third-party service.</p>
      <h2>Questions and changes</h2>
      <p><Link className="gh-text-link" href="/contact">Contact GrowthHunt</Link> about information associated with your use of this website. We update this page when our described practices change and record the revision date above.</p>
    </article>
  </EditorialFrame>
}
