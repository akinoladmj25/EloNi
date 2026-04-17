import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import { ChevronLeft, Plus, FileText, FileCheck2 } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import type { Invoice, Quote, Client } from '@/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: 'Client' }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase.from('organisations').select('id, default_currency').eq('user_id', user.id).single()
  if (!org) redirect('/settings')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('org_id', org.id)
    .single() as { data: Client | null }

  if (!client) notFound()

  const [{ data: invoices }, { data: quotes }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, status, total, currency, issue_date, due_date, paid_at')
      .eq('client_id', id)
      .eq('org_id', org.id)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: Pick<Invoice, 'id' | 'invoice_number' | 'status' | 'total' | 'currency' | 'issue_date' | 'due_date' | 'paid_at'>[] | null }>,
    supabase
      .from('quotes')
      .select('id, quote_number, status, total, currency, issue_date, expiry_date')
      .eq('client_id', id)
      .eq('org_id', org.id)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: Pick<Quote, 'id' | 'quote_number' | 'status' | 'total' | 'currency' | 'issue_date' | 'expiry_date'>[] | null }>,
  ])

  const allInvoices = invoices ?? []
  const allQuotes = quotes ?? []
  const cur = org.default_currency ?? 'GBP'

  const totalInvoiced = allInvoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const totalPaid = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalOutstanding = allInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + (i.total ?? 0), 0)

  // Late-payer scoring: avg days from issue_date to paid_at
  const paidWithDates = allInvoices.filter(i => i.status === 'paid' && i.paid_at && i.issue_date)
  const avgDaysToPay = paidWithDates.length > 0
    ? Math.round(paidWithDates.reduce((s, i) => {
        const days = (new Date(i.paid_at!).getTime() - new Date(i.issue_date).getTime()) / 86400000
        return s + days
      }, 0) / paidWithDates.length)
    : null

  const payerScore = avgDaysToPay === null
    ? { label: 'No data', color: 'bg-zinc-100 text-zinc-500' }
    : avgDaysToPay <= 10 ? { label: `Fast payer · avg ${avgDaysToPay}d`, color: 'bg-emerald-50 text-emerald-700' }
    : avgDaysToPay <= 25 ? { label: `On time · avg ${avgDaysToPay}d`, color: 'bg-blue-50 text-blue-700' }
    : avgDaysToPay <= 40 ? { label: `Slow payer · avg ${avgDaysToPay}d`, color: 'bg-amber-50 text-amber-700' }
    : { label: `Very slow · avg ${avgDaysToPay}d`, color: 'bg-red-50 text-red-700' }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Back to clients
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-zinc-900 tracking-tight">{client.name}</h1>
              {client.company && <p className="text-sm text-zinc-400">{client.company}</p>}
              <span className={`inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${payerScore.color}`}>
                {payerScore.label}
              </span>
            </div>
          </div>
          <Link
            href={`/clients/${client.id}/edit`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium transition-colors" style={{ boxShadow: 'var(--shadow-sm)' }}>
            Edit Client
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs text-zinc-400 mb-1">Total Invoiced</p>
          <p className="text-2xl font-bold text-zinc-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(totalInvoiced, cur)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{allInvoices.length} invoice{allInvoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-[3px] border-l-emerald-400" style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs text-zinc-400 mb-1">Collected</p>
          <p className="text-2xl font-bold text-zinc-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(totalPaid, cur)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{allInvoices.filter(i => i.status === 'paid').length} paid</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-[3px] border-l-blue-400" style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs text-zinc-400 mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-zinc-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(totalOutstanding, cur)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{allInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').length} pending</p>
        </div>
      </div>

      {/* Contact info */}
      {(client.email || client.phone || client.address) && (
        <div className="bg-white rounded-xl p-5 mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Contact</p>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {client.email && (
              <div>
                <p className="text-xs text-zinc-400">Email</p>
                <a href={`mailto:${client.email}`} className="text-sm text-zinc-900 hover:underline">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-xs text-zinc-400">Phone</p>
                <p className="text-sm text-zinc-900">{client.phone}</p>
              </div>
            )}
            {client.address && (
              <div>
                <p className="text-xs text-zinc-400">Address</p>
                <p className="text-sm text-zinc-900">{[client.address, client.city, client.postcode, client.country].filter(Boolean).join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Invoices */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900">Invoices</p>
              <span className="text-xs text-zinc-400">({allInvoices.length})</span>
            </div>
            <Link href={`/invoices/new`} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
              <Plus size={12} /> New
            </Link>
          </div>
          {allInvoices.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-zinc-400">No invoices yet</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {allInvoices.map(inv => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{inv.invoice_number}</p>
                    <p className="text-xs text-zinc-400">{formatDate(inv.issue_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={inv.status} />
                    <span className="text-sm font-semibold text-zinc-900">{formatMoney(inv.total, inv.currency)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quotes */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <FileCheck2 size={14} className="text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900">Quotes</p>
              <span className="text-xs text-zinc-400">({allQuotes.length})</span>
            </div>
            <Link href={`/quotes/new`} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
              <Plus size={12} /> New
            </Link>
          </div>
          {allQuotes.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-zinc-400">No quotes yet</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {allQuotes.map(q => (
                <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{q.quote_number}</p>
                    <p className="text-xs text-zinc-400">{formatDate(q.issue_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={q.status} />
                    <span className="text-sm font-semibold text-zinc-900">{formatMoney(q.total, q.currency)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
