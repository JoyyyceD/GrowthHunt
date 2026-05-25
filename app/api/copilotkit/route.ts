/**
 * CopilotKit runtime stub.
 *
 * We use CopilotKit's React hooks (useCopilotReadable, useCopilotAction) for
 * frontend state collection, but NOT its chat runtime — message flow lives at
 * /api/gtm/chat/stream. This route returns a well-formed "single default agent
 * with no actions" discovery response so CopilotKit's AgentRegistry sees a
 * healthy runtime and doesn't blow up; we don't actually use that agent.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const RUNTIME_INFO = {
  agents: [
    { id: 'default', name: 'default', description: 'GrowthHunt GTM (no-op; real chat at /api/gtm/chat/stream)' },
  ],
  actions: [],
  endpoints: [],
  version: 'gtm-stub-1',
}

export async function GET() {
  return NextResponse.json(RUNTIME_INFO)
}

export async function POST() {
  return NextResponse.json(RUNTIME_INFO)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
