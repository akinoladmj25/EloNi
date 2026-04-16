import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditExpenseForm from './EditExpenseForm'
import type { Expense } from '@/types'

export const metadata = { title: 'Edit Expense' }

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('id,default_currency')
    .eq('user_id', user.id)
    .single()

  if (!org) redirect('/settings')

  const { data: expense } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('org_id', org.id)
    .single() as { data: Expense | null }

  if (!expense) notFound()

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">Edit Expense</h1>
      </div>
      <EditExpenseForm expense={expense} />
    </div>
  )
}
