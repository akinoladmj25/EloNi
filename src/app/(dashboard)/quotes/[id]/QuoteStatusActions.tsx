'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Send, CheckCircle2, XCircle, RotateCcw, Clock, ArrowRight } from 'lucide-react'
import type { QuoteStatus } from '@/types'

interface Props {
  quoteId: string
  orgId: string
  currentStatus: QuoteStatus
  quoteNumber: string
  clientEmail?: string | null
}

export default function QuoteStatusActions({ quoteId, orgId, currentStatus, quoteNumber, clientEmail }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const updateStatus = async (newStatus: QuoteStatus) => {
    setLoading(true)
    setMsg(null)
    const supabase = createClient()
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString()
    if (newStatus === 'accepted') updates.accepted_at = new Date().toISOString()
    await supabase.from('quotes').update(updates).eq('id', quoteId)
    setLoading(false)
    router.refresh()
  }

  const sendEmail = async () => {
    setEmailSending(true)
    setMsg(null)
    try {
      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error ?? 'Failed to send email' })
      } else {
        setMsg({ type: 'success', text: 'Quote sent to client!' })
        router.refresh()
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to send email' })
    }
    setEmailSending(false)
  }

  const convertToInvoice = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: quote } = await supabase
      .from('quotes')
      .select('*, items:quote_items(*)')
      .eq('id', quoteId)
      .single()

    if (!quote) { setLoading(false); return }

    const { data: org } = await supabase
      .from('organisations').select('invoice_prefix, invoice_next_number').eq('id', orgId).single()

    const invoiceNumber = `${org?.invoice_prefix ?? 'INV'}-${org?.invoice_next_number ?? 1000}`

    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        org_id: quote.org_id,
        client_id: quote.client_id,
        invoice_number: invoiceNumber,
        status: 'draft',
        currency: quote.currency,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: null,
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

    if (invoice) {
      const items = (quote.items ?? []).map((i: { description: string; quantity: number; unit_price: number; amount: number; sort_order: number }, idx: number) => ({
        invoice_id: invoice.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        amount: i.amount,
        sort_order: i.sort_order ?? idx,
      }))
      if (items.length > 0) await supabase.from('invoice_items').insert(items)

      await supabase.from('organisations')
        .update({ invoice_next_number: (org?.invoice_next_number ?? 1000) + 1 })
        .eq('id', orgId)

      await supabase.from('quotes')
        .update({ converted_invoice_id: invoice.id, updated_at: new Date().toISOString() })
        .eq('id', quoteId)

      router.push(`/invoices/${invoice.id}`)
    }
    setLoading(false)
  }

  if (currentStatus === 'declined' || currentStatus === 'expired') {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-5">
        <h3 className="text-sm font-medium text-zinc-900 mb-3">Actions</h3>
        <button
          onClick={() => updateStatus('draft')}
          disabled={loading}
          className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-800 hover:bg-zinc-900 text-white inline-flex items-center justify-center gap-2"
        >
          <RotateCcw size={13} />
          Reopen as Draft
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-5">
      <h3 className="text-sm font-medium text-zinc-900 mb-3">Actions</h3>
      <div className="space-y-2">

        {/* Draft */}
        {currentStatus === 'draft' && (
          <>
            <button
              onClick={sendEmail}
              disabled={emailSending || loading}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-900 hover:bg-zinc-800 text-white inline-flex items-center justify-center gap-2"
            >
              <Mail size={14} />
              {emailSending ? 'Sending…' : 'Send to Client'}
            </button>
            <button
              onClick={() => updateStatus('sent')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 inline-flex items-center justify-center gap-2"
            >
              <Send size={13} />
              Mark as Sent
            </button>
            <button
              onClick={() => updateStatus('declined')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 inline-flex items-center justify-center gap-2"
            >
              <XCircle size={13} />
              Mark Declined
            </button>
          </>
        )}

        {/* Sent */}
        {currentStatus === 'sent' && (
          <>
            <button
              onClick={sendEmail}
              disabled={emailSending || loading}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 inline-flex items-center justify-center gap-2"
            >
              <Mail size={13} />
              {emailSending ? 'Sending…' : 'Resend to Client'}
            </button>
            <button
              onClick={() => updateStatus('accepted')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={13} />
              Mark as Accepted
            </button>
            <button
              onClick={() => updateStatus('declined')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-red-50 hover:bg-red-100 text-red-700 inline-flex items-center justify-center gap-2"
            >
              <XCircle size={13} />
              Mark Declined
            </button>
            <button
              onClick={() => updateStatus('expired')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 inline-flex items-center justify-center gap-2"
            >
              <Clock size={13} />
              Mark Expired
            </button>
          </>
        )}

        {/* Accepted — convert to invoice */}
        {currentStatus === 'accepted' && (
          <button
            onClick={convertToInvoice}
            disabled={loading}
            className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-900 hover:bg-zinc-800 text-white inline-flex items-center justify-center gap-2"
          >
            <ArrowRight size={13} />
            {loading ? 'Converting…' : 'Convert to Invoice'}
          </button>
        )}

        {!clientEmail && currentStatus !== 'accepted' && (
          <p className="text-[11px] text-zinc-400 text-center pt-1">
            Add client email to enable sending
          </p>
        )}
      </div>

      {msg && (
        <p className={`mt-3 text-xs text-center px-2 py-1.5 rounded ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}
    </div>
  )
}
