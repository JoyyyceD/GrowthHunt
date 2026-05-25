/**
 * Catch-all stub for CopilotKit's discovery / threads / state endpoints.
 *
 * CopilotKit's React core makes various GET/POST calls under /api/copilotkit/*
 * (threads, state, capabilities, etc.) on mount. We don't use CopilotKit's
 * chat runtime — real chat lives at /api/gtm/chat/stream — but we need these
 * stubs to keep the AgentRegistry from logging errors.
 *
 * Each subpath gets a minimal "empty" response. If a path eventually matters
 * for some hook we *do* use, we'll add a specific handler.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function emptyForPath(path: string): Record<string, unknown> {
  if (path.endsWith('threads')) return { threads: [] }
  if (path.endsWith('state')) return { state: {}, messages: [] }
  if (path.endsWith('capabilities')) return { capabilities: {} }
  // Fallback that satisfies most discovery shapes.
  return { ok: true, items: [], threads: [], state: {} }
}

export async function GET(req: NextRequest) {
  return NextResponse.json(emptyForPath(req.nextUrl.pathname))
}

export async function POST(req: NextRequest) {
  return NextResponse.json(emptyForPath(req.nextUrl.pathname))
}

export async function PUT(req: NextRequest) {
  return NextResponse.json(emptyForPath(req.nextUrl.pathname))
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(emptyForPath(req.nextUrl.pathname))
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
