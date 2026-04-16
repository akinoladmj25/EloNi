import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateQuoteNumber } from '@/lib/utils'
import NewQuoteForm from './NewQuoteForm'
import type { Client, Organisation } from '@/types'

export const metadata = { title: 'New Quote' }

export default async function NewQuotePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations').select('*').eq('user_id', user.id).single() as { data: Organisation | null }
  if (!org) redirect('/settings')

  const { data: clients } = await supabase
    .from('clients').select('*').eq('org_id', org.id).order('name') as { data: Client[] | null }

  const defaultQuoteNumber = generateQuoteNumber(org.quote_prefix ?? 'QUO', org.quote_next_number ?? 1000)

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">New Quote</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Fill in the details below</p>
      </div>
      <NewQuoteForm org={org} clients={clients ?? []} defaultQuoteNumber={defaultQuoteNumber} />
    </div>
  )
}
