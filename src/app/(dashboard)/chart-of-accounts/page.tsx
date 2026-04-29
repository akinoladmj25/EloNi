import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Account } from '@/lib/accounting'
import ChartOfAccountsClient from './ChartOfAccountsClient'

export const metadata = { title: 'Chart of Accounts' }

export default async function ChartOfAccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations').select('id, default_currency, name').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  // Auto-seed if empty
  const { data: existing } = await supabase
    .from('chart_of_accounts').select('id').eq('org_id', org.id).limit(1)
  if (!existing || existing.length === 0) {
    await supabase.rpc('seed_chart_of_accounts', { p_org_id: org.id })
  }

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, type, subtype, opening_balance, is_system, is_active')
    .eq('org_id', org.id)
    .order('code') as unknown as { data: Account[] | null }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Chart of Accounts</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Configure your accounts and set opening balances</p>
      </div>
      <ChartOfAccountsClient accounts={accounts ?? []} currency={org.default_currency} />
    </div>
  )
}
