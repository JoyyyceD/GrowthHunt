import { createAdminClient } from '../lib/supabase/admin'
const wsId = process.argv[2]
const admin = createAdminClient()
let last = ''
for (;;) {
  const { data } = await admin.from('scout_tasks').select('status, progress, error').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (data) {
    const sig = `${data.status}:${(data.progress as unknown[])?.length || 0}`
    if (sig !== last) {
      last = sig
      console.log(`status=${data.status} milestones=${(data.progress as unknown[])?.length || 0}${data.error ? ` error=${data.error}` : ''}`)
    }
    if (['done', 'failed', 'needs_brief'].includes(data.status)) process.exit(0)
  }
  await new Promise(r => setTimeout(r, 10000))
}
