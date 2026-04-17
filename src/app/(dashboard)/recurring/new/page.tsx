import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewRecurringForm from './NewRecurringForm'
import type { Client } from '@/types'

export const metadata = { title: 'New Recurring Invoice' }

export default async function NewRecurringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('id,default_currency,tax_name')
    .eq('user_id', user.id)
    .single()

  if (!org) redirect('/settings')

  const { data: clients } = await supabase
    .from('clients')
    .select('id,name,company')
    .eq('org_id', org.id)
    .order('name') as { data: Pick<Client, 'id' | 'name' | 'company'>[] | null }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">New Recurring Invoice</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Set up an invoice template that repeats automatically</p>
      </div>
      <NewRecurringForm
        orgId={org.id}
        defaultCurrency={org.default_currency}
        taxName={org.tax_name}
        clients={clients ?? []}
      />
    </div>
  )
}
