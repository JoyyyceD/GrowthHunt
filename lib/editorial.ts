export interface ToolProfile {
  slug: string
  name: string
  category: string
  task: string
  summary: string
  fit: string
  skip: string
  considerations: string[]
  website: string
  pricing: string
  sourceChecked: string
  affiliate: { approved: boolean; url: string | null }
}

export const softwareCategories = [
  { id: 'office', name: 'Office & documents', description: 'Write, present, organize, and work with PDFs.', examples: 'WPS Office · PDFelement', toolSlugs: ['wps-office', 'pdfelement'] },
  { id: 'video', name: 'Video & content', description: 'Turn recordings and ideas into finished videos.', examples: 'Filmora', toolSlugs: ['filmora'] },
  { id: 'meetings', name: 'Meetings & transcription', description: 'Capture conversations and work with the notes.', examples: 'Notta', toolSlugs: ['notta'] },
  { id: 'ai', name: 'AI assistants', description: 'Find an assistant that fits your everyday tasks.', examples: 'Proton Lumo', toolSlugs: ['proton-lumo'] },
  { id: 'design', name: 'Design & visualization', description: 'Plan spaces and present your interior ideas.', examples: 'Homestyler', toolSlugs: ['homestyler'] },
]

// Add an affiliate URL only after this exact program and traffic type are approved.
// An unapproved URL never renders, even if someone fills the field prematurely.
export const tools: ToolProfile[] = [
  {
    slug: 'notta', name: 'Notta', category: 'Meetings & transcription', task: 'Turn conversations and recordings into usable notes',
    summary: 'Notta offers meeting recording, audio and video transcription, and AI-generated meeting notes. This overview uses its official product and pricing information.',
    fit: 'Individuals and teams evaluating transcription for interviews, meetings, and recorded conversations.',
    skip: 'If you only need a few manually written notes, an additional transcription subscription may add more process than value.',
    considerations: ['Try a short, representative recording before buying. Check names, specialist vocabulary, speaker labels, and the languages your customers use.', 'Compare per-conversation limits and monthly allowances with your interview schedule. An attractive headline price does not tell you how many full interviews a plan can handle.', 'Decide how participants will be informed about recording and how recordings and transcripts will be accessed, shared, and deleted.'],
    website: 'https://www.notta.ai/en', pricing: 'https://www.notta.ai/en/pricing', sourceChecked: '2026-11-02', affiliate: { approved: false, url: null },
  },
  {
    slug: 'filmora', name: 'Wondershare Filmora', category: 'Content & video', task: 'Edit videos for your content, projects, and presentations',
    summary: 'Filmora is Wondershare’s video editor, with editing and AI-assisted creation features. This overview uses its official product and purchase pages.',
    fit: 'Creators and small teams comparing an editor for videos, walkthroughs, and social content.',
    skip: 'If a single unedited screen recording is enough to explain the product, start there before paying for an editor.',
    considerations: ['List the output you actually need: aspect ratio, resolution, captions, voice-over, and a clean export. Test one complete clip against that list.', 'Check the license and plan for your operating system, commercial use, renewal terms, included assets, and any separate AI credit allowances.', 'Keep the original recording and an export outside the project file. Include editing time and revision effort when comparing tools.'],
    website: 'https://filmora.wondershare.com/', pricing: 'https://filmora.wondershare.com/shop/buy/buy-video-editor.html', sourceChecked: '2026-11-02', affiliate: { approved: false, url: null },
  },
  {
    slug: 'wps-office', name: 'WPS Office', category: 'Documents & productivity', task: 'Create proposals, spreadsheets, and presentations',
    summary: 'WPS Office brings document, spreadsheet, presentation, and PDF tools into an office suite. Its website also lists AI-assisted features; availability should be checked for the plan you select.',
    fit: 'Individuals, students, and small teams comparing an office suite for everyday documents and shared files.',
    skip: 'If your current suite already handles your files and collaboration needs, switching solely for an AI label may not be worthwhile.',
    considerations: ['Test copies of real files for formatting, formulas, fonts, and export compatibility before moving a workflow.', 'Separate the features you need from optional AI functionality. Check which are included in the specific platform and plan.', 'Compare editing and collaboration needs with your current workflow. Use non-sensitive sample files while evaluating an unfamiliar service.'],
    website: 'https://www.wps.com/', pricing: 'https://www.wps.com/buy/', sourceChecked: '2026-11-02', affiliate: { approved: false, url: null },
  },
  {
    slug: 'pdfelement', name: 'Wondershare PDFelement', category: 'Documents & productivity', task: 'Edit, convert, and annotate PDF documents',
    summary: 'PDFelement is Wondershare’s PDF software for document editing, conversion, and annotation. This is a documentation-based product overview.',
    fit: 'Small teams assessing a dedicated PDF workflow for proposals, documents, and client handoffs.',
    skip: 'If you only read PDFs or add occasional simple annotations, check whether your existing viewer already covers the task.',
    considerations: ['Make a list of required PDF operations and test a copy of a representative file. Check the finished export, not just the editor preview.', 'Verify whether the features you need are included for your operating system and purchase option.', 'Check handling of uploaded files before using confidential documents. Keep an original copy so evaluation edits are reversible.'],
    website: 'https://pdf.wondershare.com/', pricing: 'https://pdf.wondershare.com/', sourceChecked: '2026-11-02', affiliate: { approved: false, url: null },
  },
  {
    slug: 'proton-lumo', name: 'Proton Lumo', category: 'AI assistants', task: 'Evaluate an AI assistant with privacy as a selection criterion',
    summary: 'Proton describes Lumo as a privacy-focused AI assistant. Its official site explains the service and links to its security model and plans. This overview does not independently verify those security claims.',
    fit: 'Individuals and professionals comparing AI assistants with particular attention to the provider’s data handling.',
    skip: 'If a task requires a specific integration, capability, or contractual assurance, confirm it explicitly rather than assuming a privacy-focused assistant includes it.',
    considerations: ['Read the provider’s security model and privacy information alongside the feature list. Separate documented claims from independently validated behavior.', 'Try a non-sensitive example of the work you want to perform, and review the output against your own requirements.', 'Confirm plan limits and organizational requirements before choosing it for a team. Do not treat a general product overview as approval to upload confidential material.'],
    website: 'https://proton.me/lumo', pricing: 'https://proton.me/lumo', sourceChecked: '2026-11-02', affiliate: { approved: false, url: null },
  },
  {
    slug: 'homestyler', name: 'Homestyler', category: 'Design & visualization', task: 'Explore 3D interior design and space visualization',
    summary: 'Homestyler provides tools for interior design and 3D space visualization. Its official site describes floor planning, rendering, and related design features.',
    fit: 'Home planners, interior professionals, and creators comparing ways to develop and present an interior concept.',
    skip: 'If you only need a simple sketch or mood board, check whether a dedicated 3D design workflow adds value to the project.',
    considerations: ['Define the deliverable first: a floor plan, still visualization, or another design presentation. Check what the selected plan can export.', 'Review rendering allowances, asset access, and commercial-use conditions on the official site before a client project.', 'Test a small representative scene before moving a project. This guide does not report measured rendering quality or performance.'],
    website: 'https://www.homestyler.com/', pricing: 'https://www.homestyler.com/', sourceChecked: '2026-11-02', affiliate: { approved: false, url: null },
  },
]

export function getTool(slug: string) { return tools.find(tool => tool.slug === slug) }
export function outbound(tool: ToolProfile) {
  const sponsored = tool.affiliate.approved && Boolean(tool.affiliate.url)
  return { href: sponsored ? tool.affiliate.url! : tool.website, rel: sponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer', sponsored }
}

export const guides = [
  {
    slug: 'choose-customer-interview-transcription', title: 'Choosing transcription software for customer interviews',
    description: 'A practical buying checklist: recording quality, transcript review, plan limits, and your existing meeting workflow.', toolSlugs: ['notta'],
    sections: [
      { title: 'Start with the decision the interview should inform', text: 'Write down the product or messaging decision first. A transcript is useful when it helps you revisit what someone actually said. It is not a substitute for asking useful questions or distinguishing a customer request from a broader pattern.' },
      { title: 'Use a short sample that resembles your real calls', text: 'Before committing to a paid plan, evaluate a short recording with the accents, specialist terms, background noise, and number of speakers you expect. Mark incorrect names, numbers, and quotations. Check how easily you can return from the transcript to the original recording.' },
      { title: 'Compare the workflow, not just the feature list', text: 'Your comparison sheet should include the capture method, review effort, export formats, participant experience, and how the transcript reaches the people making decisions. A tool that fits your existing meeting setup may be more useful than one with a longer feature list.' },
      { title: 'Read the plan limits against your interview schedule', text: 'Estimate how many conversations you expect and how long each lasts. Check both monthly allowances and per-recording limits on the vendor’s current pricing page. Verify billing period, currency, renewal terms, and the features included in the exact plan before purchase.' },
      { title: 'Keep a manual review step', text: 'Review quotations and factual details against the recording before they appear in product copy or research summaries. Decide who can access recordings and transcripts, how participants are informed, and when the files will be deleted. Do not assume an AI summary preserves every important qualification.' },
      { title: 'Where Notta fits into this evaluation', text: 'Notta is one candidate for this workflow. Our linked profile explains its documented purpose and what to check before buying. We have not provided a hands-on accuracy score or a claimed time saving. Compare it with the transcription already available in your existing meeting setup before adding another subscription.' },
    ],
  },
  {
    slug: 'choose-product-demo-video-editor', title: 'Choosing a video editor for a product demo',
    description: 'Define the demo, check export and licensing needs, and avoid buying an editor before you know what you need to show.', toolSlugs: ['filmora'],
    sections: [
      { title: 'Decide what the viewer needs to understand', text: 'Pick one audience, one problem, and one action you want the viewer to take. Draft a short sequence that shows the problem and the relevant product interaction. This is a planning checklist, not a claim that a particular video format produces more signups.' },
      { title: 'Separate recording from editing', text: 'Capture a clear walkthrough using sample data. Then list the edits it actually needs: removing dead time, changing the aspect ratio, adding captions, or introducing a voice-over. If the original recording already works, an additional editing subscription may be unnecessary.' },
      { title: 'Test the full path to a finished export', text: 'Import a short clip, make the edits you need, and export a finished file. Check legibility on a phone, caption corrections, audio, and whether the output meets your intended publishing requirements. A preview inside the editor does not establish that the final export will meet your needs.' },
      { title: 'Understand the purchase before paying', text: 'On the vendor’s purchase page, check the operating system, subscription or purchase model, renewals, commercial-use terms, asset permissions, and any separate AI allowances. Do not infer what a license includes from a generic “AI video editor” label.' },
      { title: 'Where Filmora fits into this evaluation', text: 'Filmora is one editing candidate. The linked profile is based on official documentation, rather than a timed editing test. Use it to prepare a shortlist, then test a representative clip before buying. Keep the original recording and record the reason for choosing or rejecting the tool.' },
      { title: 'Measure the next step in your own funnel', text: 'If you publish the demo, record where it appears and what action follows it. Views, website visits, and paid customers answer different questions. Treat any business outcome as something to measure in your context rather than a promised property of the editing software.' },
    ],
  },
]
