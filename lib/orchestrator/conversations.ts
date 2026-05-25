/**
 * Conversation + message persistence for the chat orchestrator.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { GtmConversation, GtmMessage } from './types'

function hydrateConv(row: Record<string, unknown>): GtmConversation {
  return {
    id: row.id as string,
    workspace_id: row.workspace_id as string,
    title: (row.title as string) || 'New chat',
    created_at: row.created_at as string,
    last_message_at: row.last_message_at as string,
  }
}

function hydrateMsg(row: Record<string, unknown>): GtmMessage {
  return {
    id: row.id as string,
    conversation_id: row.conversation_id as string,
    role: row.role as GtmMessage['role'],
    content: (row.content as string) || '',
    tool_call: (row.tool_call as GtmMessage['tool_call']) ?? null,
    task_id: (row.task_id as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

export async function createConversation(workspaceId: string, title = 'New chat'): Promise<GtmConversation | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('gtm_conversations')
      .insert({ workspace_id: workspaceId, title })
      .select('*')
      .single()
    if (error || !data) return null
    return hydrateConv(data)
  } catch { return null }
}

export async function getConversation(id: string): Promise<GtmConversation | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('gtm_conversations').select('*').eq('id', id).maybeSingle()
    return data ? hydrateConv(data) : null
  } catch { return null }
}

export async function listConversations(workspaceId: string, limit = 30): Promise<GtmConversation[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('gtm_conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('last_message_at', { ascending: false })
      .limit(limit)
    return (data || []).map(hydrateConv)
  } catch { return [] }
}

export async function listMessages(conversationId: string, limit = 200): Promise<GtmMessage[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('gtm_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)
    return (data || []).map(hydrateMsg)
  } catch { return [] }
}

export interface AppendMessageInput {
  conversation_id: string
  role: 'user' | 'assistant' | 'tool'
  content?: string
  tool_call?: GtmMessage['tool_call']
  task_id?: string | null
}

export async function appendMessage(input: AppendMessageInput): Promise<GtmMessage | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('gtm_messages')
      .insert({
        conversation_id: input.conversation_id,
        role: input.role,
        content: input.content ?? '',
        tool_call: input.tool_call ?? null,
        task_id: input.task_id ?? null,
      })
      .select('*')
      .single()
    if (error || !data) return null
    return hydrateMsg(data)
  } catch { return null }
}

/** Set conversation title if it's still the default. */
export async function maybeAutoTitle(conversationId: string, candidate: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('gtm_conversations').select('title').eq('id', conversationId).maybeSingle()
    if (!data || data.title !== 'New chat') return
    const title = candidate.trim().slice(0, 80).replace(/\s+/g, ' ')
    if (!title) return
    await admin.from('gtm_conversations').update({ title }).eq('id', conversationId)
  } catch { /* noop */ }
}
