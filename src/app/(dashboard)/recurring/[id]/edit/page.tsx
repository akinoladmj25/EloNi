import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditRecurringForm from './EditRecurringForm'
import type { RecurringInvoice, RecurringInvoiceItem, Client } from '@/types'

export const metadata = { title: 'Edit Recurring Invoice' }

export default async function EditRecurringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('id,default_currency,tax_name')
    .eq('user_id', user.id)
    .single()

  if (!org) redirect('/settings')

  const { data: rec } = await supabase
    .from('recurring_invoices')
    .select('*, items:recurring_invoice_items(*)')
    .eq('id', id)
    .eq('org_id', org.id)
    .single() as {
      data: (RecurringInvoice & { items: RecurringInvoiceItem[] }) | null
    }

  if (!rec) notFound()

  const { data: clients } = await supabase
    .from('clients')
    .select('id,name,company')
    .eq('org_id', org.id)
    .order('name') as { data: Pick<Client, 'id' | 'name' | 'company'>[] | null }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">Edit Recurring Invoice</h1>
      </div>
      <EditRecurringForm
        rec={rec}
        orgId={org.id}
        taxName={org.tax_name}
        clients={clients ?? []}
      />
    </div>
  )
}
