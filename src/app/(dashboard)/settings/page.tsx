import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Organisation } from '@/types'
import SettingsForm from './SettingsForm'
import HmrcConnectionCard from '@/components/HmrcConnectionCard'
import { hmrcConfig } from '@/lib/hmrc/client'

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

  const { data: hmrcConn } = org
    ? await supabase
        .from('hmrc_connections')
        .select('vat_number, connected_at, token_expires_at, last_used_at')
        .eq('org_id', org.id)
        .maybeSingle()
    : { data: null }

  const cfg = hmrcConfig()

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">Settings</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Manage your business profile and preferences</p>
      </div>
      <div className="max-w-2xl mx-auto space-y-6">
        <SettingsForm org={org} userId={user.id} />
        {org?.vat_registered && (
          <HmrcConnectionCard
            connection={hmrcConn}
            hmrcConfigured={cfg.isConfigured}
            hasVatNumber={!!org?.vat_number}
          />
        )}
      </div>
    </div>
  )
}
