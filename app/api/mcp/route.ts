/**
 * MCP server — JSON-RPC 2.0 over HTTP, per the Model Context Protocol spec
 * (modelcontextprotocol.io). Supports stateless HTTP transport (single
 * POST per request), which all major MCP clients (Claude Desktop, Cursor,
 * ChatGPT) handle.
 *
 * Auth: `Authorization: Bearer gh_mcp_…` → identifies the workspace.
 *
 * Methods implemented:
 *   - initialize             handshake + server capabilities
 *   - tools/list             advertise the tool manifest
 *   - tools/call             dispatch one tool, return its result
 *
 * Errors follow JSON-RPC: { code, message }. We keep payloads small.
 */
import { NextRequest, NextResponse } from 'next/server'
import { workspaceForKey } from '@/lib/mcp/key'
import { MCP_TOOLS, findMcpTool } from '@/lib/mcp/tools'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: number | string | null
  method: string
  params?: Record<string, unknown>
}

function rpcResult(id: JsonRpcRequest['id'], result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result })
}

function rpcError(id: JsonRpcRequest['id'], code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status })
}

function extractBearer(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(\S+)$/i)
  return m ? m[1] : null
}

export async function GET() {
  // Some MCP probes hit GET first — answer with a minimal capabilities ping.
  return NextResponse.json({
    name: 'growthhunt-mcp',
    version: '0.1.0',
    protocolVersion: '2024-11-05',
    transport: 'http',
  })
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest
  try { body = await req.json() } catch { return rpcError(null, -32700, 'parse error', 400) }
  if (body?.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return rpcError(body?.id ?? null, -32600, 'invalid request', 400)
  }

  // initialize doesn't require auth (clients call it before sending the key
  // in some setups). We still keep the auth check on tools/* calls.
  if (body.method === 'initialize') {
    return rpcResult(body.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'growthhunt-mcp', version: '0.1.0' },
      instructions:
        'GrowthHunt scheduler MCP. Authenticate with Authorization: Bearer gh_mcp_<key> ' +
        '(get it from the Scheduler page). Tools: schedule_post, list_scheduled_posts, ' +
        'list_connections, get_workspace.',
    })
  }

  const key = extractBearer(req)
  if (!key) return rpcError(body.id, -32001, 'unauthorized — Bearer gh_mcp_* required', 401)
  const ws = await workspaceForKey(key)
  if (!ws) return rpcError(body.id, -32001, 'invalid or revoked MCP key', 401)

  if (body.method === 'tools/list') {
    return rpcResult(body.id, {
      tools: MCP_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    })
  }

  if (body.method === 'tools/call') {
    const params = body.params as { name?: string; arguments?: Record<string, unknown> } | undefined
    const name = params?.name
    const args = params?.arguments ?? {}
    if (!name) return rpcError(body.id, -32602, 'tool name required')
    const tool = findMcpTool(name)
    if (!tool) return rpcError(body.id, -32601, `unknown tool: ${name}`)
    try {
      const result = await tool.run(args, { workspaceId: ws.id })
      // MCP tools/call result shape: { content: [{type:'text', text:'...'}], isError? }
      return rpcResult(body.id, {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: Boolean((result as { error?: unknown }).error),
      })
    } catch (e) {
      return rpcResult(body.id, {
        content: [{ type: 'text', text: `Tool ${name} threw: ${(e as Error).message.slice(0, 300)}` }],
        isError: true,
      })
    }
  }

  return rpcError(body.id, -32601, `method not found: ${body.method}`)
}
