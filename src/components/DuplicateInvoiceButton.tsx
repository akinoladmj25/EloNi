'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Copy } from 'lucide-react'

interface Props {
  invoiceId: string
  orgId: string
}

export default function DuplicateInvoiceButton({ invoiceId, orgId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const duplicate = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .eq('id', invoiceId)
      .single()

    if (!invoice) { setLoading(false); return }

    const { data: org } = await supabase
      .from('organisations')
      .select('invoice_prefix, invoice_next_number')
      .eq('id', orgId)
      .single()

    const invoiceNumber = `${org?.invoice_prefix ?? 'INV'}-${org?.invoice_next_number ?? 1000}`

    const { data: newInvoice } = await supabase
      .from('invoices')
      .insert({
        org_id: invoice.org_id,
        client_id: invoice.client_id,
        invoice_number: invoiceNumber,
        status: 'draft',
        currency: invoice.currency,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: invoice.due_date,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        tax_rate: invoice.tax_rate,
        tax_amount: invoice.tax_amount,
        total: invoice.total,
        notes: invoice.notes,
        terms: invoice.terms,
      })
      .select()
      .single()

    if (newInvoice) {
      const items = (invoice.items ?? []).map((i: { description: string; quantity: number; unit_price: number; amount: number; sort_order: number }, idx: number) => ({
        invoice_id: newInvoice.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        amount: i.amount,
        sort_order: i.sort_order ?? idx,
      }))
      if (items.length > 0) await supabase.from('invoice_items').insert(items)

      await supabase
        .from('organisations')
        .update({ invoice_next_number: (org?.invoice_next_number ?? 1000) + 1 })
        .eq('id', orgId)

      router.push(`/invoices/${newInvoice.id}`)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={duplicate}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
    >
      <Copy size={14} />
      {loading ? 'Duplicating…' : 'Duplicate'}
    </button>
  )
}
