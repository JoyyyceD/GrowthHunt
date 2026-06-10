import { createAdminClient } from '../lib/supabase/admin'
import { matchCases, buildCaseNotes } from '../lib/scout/case-match'

const admin = createAdminClient()
const { data } = await admin.from('scout_tasks').select('result').eq('workspace_id', 'ba5bdc4a-6900-477a-8039-bac99575c67b').eq('status', 'done').order('created_at', { ascending: false }).limit(1).single()
const intel = (data!.result as { intel: unknown }).intel
const matches = await matchCases(intel as never)
console.log('matches:', JSON.stringify(matches.map(m => ({ slug: m.slug, lesson: m.lesson })), null, 1))
console.log('--- caseNotes ---')
console.log(buildCaseNotes(matches) || '(none)')
