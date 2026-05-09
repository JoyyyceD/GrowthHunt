import { createServerClient } from '@/lib/supabase/server'
import { requireGoogleAuth } from '@/lib/picolaunch/auth-gate'
import { profileToMe } from '@/lib/opc-mappers'
import type { ProfileRow } from '@/lib/opc-types'
import SettingsForm from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireGoogleAuth('/picolaunch/account/settings')
  const supabase = await createServerClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const me = data
    ? profileToMe(data as ProfileRow)
    : profileToMe({
        id: user.id,
        email: user.email,
        display_name: user.name,
        avatar_url: user.avatar,
        bio: null,
        twitter: null,
        site: null,
        created_at: new Date().toISOString(),
      } as ProfileRow)

  return <SettingsForm initial={me} />
}
