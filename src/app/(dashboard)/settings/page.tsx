import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Organisation } from '@/types'
import SettingsForm from './SettingsForm'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: Organisation | null }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">Settings</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Manage your business profile and preferences</p>
      </div>
      <SettingsForm org={org} userId={user.id} />
    </div>
  )
}
