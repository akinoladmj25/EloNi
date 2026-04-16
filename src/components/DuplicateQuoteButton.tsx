'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Copy } from 'lucide-react'

interface Props {
  quoteId: string
  orgId: string
}

export default function DuplicateQuoteButton({ quoteId, orgId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const duplicate = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: quote } = await supabase
      .from('quotes')
      .select('*, items:quote_items(*)')
      .eq('id', quoteId)
      .single()

    if (!quote) { setLoading(false); return }

    const { data: org } = await supabase
      .from('organisations')
      .select('quote_prefix, quote_next_number')
      .eq('id', orgId)
      .single()

    const quoteNumber = `${org?.quote_prefix ?? 'QUO'}-${org?.quote_next_number ?? 1000}`

    const { data: newQuote } = await supabase
      .from('quotes')
      .insert({
        org_id: quote.org_id,
        client_id: quote.client_id,
        quote_number: quoteNumber,
        status: 'draft',
        currency: quote.currency,
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: quote.expiry_date,
        subtotal: quote.subtotal,
        discount: quote.discount,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
        notes: quote.notes,
        terms: quote.terms,
      })
      .select()
      .single()

    if (newQuote) {
      const items = (quote.items ?? []).map((i: { description: string; quantity: number; unit_price: number; amount: number; sort_order: number }, idx: number) => ({
        quote_id: newQuote.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        amount: i.amount,
        sort_order: i.sort_order ?? idx,
      }))
      if (items.length > 0) await supabase.from('quote_items').insert(items)

      await supabase
        .from('organisations')
        .update({ quote_next_number: (org?.quote_next_number ?? 1000) + 1 })
        .eq('id', orgId)

      router.push(`/quotes/${newQuote.id}`)
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
