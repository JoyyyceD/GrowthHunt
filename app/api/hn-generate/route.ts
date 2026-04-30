import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { template, placeholders, description } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

  const systemPrompt = `You are an expert at writing viral Hacker News posts.
Write authentic, technically credible HN posts that sound like a real founder/developer sharing their work.
Keep the tone humble, factual, and developer-friendly. No hype.`

  const userPrompt = `Template pattern: ${template.pattern}
Topic: ${template.topic}
Hook type: ${template.hook_type}

User's placeholders: ${JSON.stringify(placeholders)}
Additional context: ${description || 'None provided'}

Generate 3 variations of this HN post title following the template pattern.
Then write a 3-paragraph body for the best variation (what you'd put in the "text" field when submitting to HN).

Format your response as JSON:
{
  "titles": ["title 1", "title 2", "title 3"],
  "best_title": "title 1",
  "body": "paragraph 1\\n\\nparagraph 2\\n\\nparagraph 3"
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const result = JSON.parse(jsonMatch?.[0] || '{}')
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Parse error', raw: text }, { status: 500 })
  }
}
