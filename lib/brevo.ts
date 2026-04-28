const BREVO_API_URL = 'https://api.brevo.com/v3'

export async function addContact(email: string, source: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY is not set')

  const res = await fetch(`${BREVO_API_URL}/contacts`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      attributes: { SOURCE: source },
      updateEnabled: true,
    }),
  })

  if (!res.ok && res.status !== 204) {
    const body = await res.text()
    throw new Error(`Brevo API error ${res.status}: ${body}`)
  }
}

export async function sendTransactionalEmail(opts: {
  to: string
  subject: string
  htmlContent: string
  senderEmail?: string
  senderName?: string
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY is not set')

  const res = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: opts.senderEmail ?? 'hi@growthhunt.ai',
        name: opts.senderName ?? 'GrowthHunt',
      },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.htmlContent,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Brevo transactional API error ${res.status}: ${body}`)
  }
}
