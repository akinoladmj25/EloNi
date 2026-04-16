import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewExpenseForm from './NewExpenseForm'

export const metadata = { title: 'Add Expense' }

export default async function NewExpensePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('id,default_currency')
    .eq('user_id', user.id)
    .single()

  if (!org) redirect('/settings')

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">Add Expense</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Record a business expense</p>
      </div>
      <NewExpenseForm orgId={org.id} defaultCurrency={org.default_currency} />
    </div>
  )
}
