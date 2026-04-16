'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, CheckCircle2, XCircle, AlertCircle, RotateCcw, Mail } from 'lucide-react'
import type { InvoiceStatus } from '@/types'

interface Props {
  invoiceId: string
  currentStatus: InvoiceStatus
  clientEmail?: string | null
}

export default function InvoiceStatusActions({ invoiceId, currentStatus, clientEmail }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const updateStatus = async (newStatus: InvoiceStatus) => {
    setLoading(true)
    setMsg(null)
    const supabase = createClient()
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    if (newStatus === 'paid') updates.paid_at = new Date().toISOString()
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString()
    await supabase.from('invoices').update(updates).eq('id', invoiceId)
    setLoading(false)
    router.refresh()
  }

  const sendEmail = async () => {
    setEmailSending(true)
    setMsg(null)
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error ?? 'Failed to send email' })
      } else {
        setMsg({ type: 'success', text: 'Invoice sent to client!' })
        router.refresh()
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to send email' })
    }
    setEmailSending(false)
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-5">
      <h3 className="text-sm font-medium text-zinc-900 mb-3">Actions</h3>
      <div className="space-y-2">

        {/* Draft: send email or mark sent */}
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
              onClick={() => updateStatus('cancelled')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 inline-flex items-center justify-center gap-2"
            >
              <XCircle size={13} />
              Cancel Invoice
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
              onClick={() => updateStatus('paid')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={13} />
              Mark as Paid
            </button>
            <button
              onClick={() => updateStatus('overdue')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-red-50 hover:bg-red-100 text-red-700 inline-flex items-center justify-center gap-2"
            >
              <AlertCircle size={13} />
              Mark as Overdue
            </button>
            <button
              onClick={() => updateStatus('cancelled')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 inline-flex items-center justify-center gap-2"
            >
              <XCircle size={13} />
              Cancel Invoice
            </button>
          </>
        )}

        {/* Overdue */}
        {currentStatus === 'overdue' && (
          <>
            <button
              onClick={sendEmail}
              disabled={emailSending || loading}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 inline-flex items-center justify-center gap-2"
            >
              <Mail size={13} />
              {emailSending ? 'Sending…' : 'Send Reminder'}
            </button>
            <button
              onClick={() => updateStatus('paid')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={13} />
              Mark as Paid
            </button>
            <button
              onClick={() => updateStatus('cancelled')}
              disabled={loading || emailSending}
              className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 inline-flex items-center justify-center gap-2"
            >
              <XCircle size={13} />
              Cancel Invoice
            </button>
          </>
        )}

        {/* Cancelled */}
        {currentStatus === 'cancelled' && (
          <button
            onClick={() => updateStatus('draft')}
            disabled={loading}
            className="w-full h-9 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-zinc-800 hover:bg-zinc-900 text-white inline-flex items-center justify-center gap-2"
          >
            <RotateCcw size={13} />
            Reopen as Draft
          </button>
        )}

        {/* No email warning */}
        {!clientEmail && currentStatus !== 'paid' && currentStatus !== 'cancelled' && (
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
