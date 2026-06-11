import { createAdminClient } from '../lib/supabase/admin'
import { fetchAndStoreLogo } from '../lib/scout/brand-assets'

const admin = createAdminClient()
const { data: ws } = await admin.from('gtm_workspaces').select('id, name, url').ilike('name', '%evermemory%').limit(1).single()
console.log('workspace:', ws!.name, ws!.url)
const url = await fetchAndStoreLogo(ws!.id as string, ws!.url as string)
console.log('logo:', url || 'FAILED')
