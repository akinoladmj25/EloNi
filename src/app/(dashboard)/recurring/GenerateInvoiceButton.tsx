'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'

interface Props {
  recurringId: string
  orgId: string
}

export default function GenerateInvoiceButton({ recurringId, orgId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch recurring invoice + items
    const { data: rec } = await supabase
      .from('recurring_invoices')
      .select('*, items:recurring_invoice_items(*)')
      .eq('id', recurringId)
      .single()

    if (!rec) { setLoading(false); return }

    // Get org for next invoice number
    const { data: org } = await supabase
      .from('organisations')
      .select('invoice_prefix,invoice_next_number')
      .eq('id', orgId)
      .single()

    if (!org) { setLoading(false); return }

    const invoiceNumber = `${org.invoice_prefix}-${org.invoice_next_number}`

    // Create invoice
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        org_id: orgId,
        client_id: rec.client_id,
        invoice_number: invoiceNumber,
        status: 'draft',
        currency: rec.currency,
        issue_date: new Date().toISOString().split('T')[0],
        subtotal: rec.subtotal,
        discount: rec.discount,
        tax_rate: rec.tax_rate,
        tax_amount: rec.tax_amount,
        total: rec.total,
        notes: rec.notes,
        terms: rec.terms,
      })
      .select('id')
      .single()

    if (error || !invoice) { setLoading(false); return }

    // Copy line items
    if (rec.items?.length) {
      await supabase.from('invoice_items').insert(
        rec.items.map((item: { description: string; quantity: number; unit_price: number; amount: number; sort_order: number }) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: item.sort_order,
        }))
      )
    }

    // Increment org invoice number
    await supabase
      .from('organisations')
      .update({ invoice_next_number: org.invoice_next_number + 1 })
      .eq('id', orgId)

    // Advance next_date based on frequency
    const next = new Date(rec.next_date)
    if (rec.frequency === 'weekly') next.setDate(next.getDate() + 7)
    else if (rec.frequency === 'monthly') next.setMonth(next.getMonth() + 1)
    else if (rec.frequency === 'quarterly') next.setMonth(next.getMonth() + 3)
    else if (rec.frequency === 'annually') next.setFullYear(next.getFullYear() + 1)

    await supabase
      .from('recurring_invoices')
      .update({ next_date: next.toISOString().split('T')[0], updated_at: new Date().toISOString() })
      .eq('id', recurringId)

    setLoading(false)
    setDone(true)
    setTimeout(() => { setDone(false); router.push(`/invoices/${invoice.id}`) }, 800)
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading || done}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium transition-colors disabled:opacity-60 ${
        done
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
      }`}
    >
      <Zap size={11} />
      {loading ? 'Generating…' : done ? 'Created!' : 'Generate'}
    </button>
  )
}
