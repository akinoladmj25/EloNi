import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Invoice, InvoiceItem, Client, Organisation } from '@/types'
import EditInvoiceForm from './EditInvoiceForm'

export const metadata = { title: 'Edit Invoice' }

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations').select('*').eq('user_id', user.id).single() as { data: Organisation | null }
  if (!org) redirect('/settings')

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*)')
    .eq('id', id)
    .eq('org_id', org.id)
    .single() as { data: (Invoice & { items: InvoiceItem[] }) | null }

  if (!invoice) notFound()

  const { data: clients } = await supabase
    .from('clients').select('*').eq('org_id', org.id).order('name') as { data: Client[] | null }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">Edit Invoice</h1>
        <p className="text-sm text-zinc-400 mt-0.5">{invoice.invoice_number}</p>
      </div>
      <EditInvoiceForm invoice={invoice} org={org} clients={clients ?? []} />
    </div>
  )
}
