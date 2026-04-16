import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import { ChevronLeft, Printer, ExternalLink } from 'lucide-react'
import type { Quote, QuoteItem, Client } from '@/types'
import QuoteStatusActions from './QuoteStatusActions'
import DuplicateQuoteButton from '@/components/DuplicateQuoteButton'
import ShareQuoteButton from '@/components/ShareQuoteButton'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Quote ${id.slice(0, 8)}` }
}

const STATUS: Record<string, string> = {
  draft:    'text-zinc-500 bg-zinc-100',
  sent:     'text-blue-700 bg-blue-50',
  accepted: 'text-emerald-700 bg-emerald-50',
  declined: 'text-red-700 bg-red-50',
  expired:  'text-zinc-400 bg-zinc-100',
}
function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium capitalize ${STATUS[status] ?? STATUS.draft}`}>{status}</span>
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase.from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/settings')

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, client:clients(*), items:quote_items(*)')
    .eq('id', id)
    .eq('org_id', org.id)
    .single() as {
      data: (Quote & { client: Client | null; items: QuoteItem[] }) | null
    }

  if (!quote) notFound()

  const items = (quote.items ?? []).sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link href="/quotes" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Back to quotes
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-zinc-900">{quote.quote_number}</h1>
            <StatusBadge status={quote.status} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/quote/${quote.id}/print`} target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              <Printer size={15} /> Print / PDF
            </Link>
            <Link href={`/quotes/${quote.id}/edit`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              <ExternalLink size={15} /> Edit
            </Link>
            <ShareQuoteButton quoteId={quote.id} publicToken={quote.public_token ?? null} />
            <DuplicateQuoteButton quoteId={quote.id} orgId={org.id} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* From / To */}
          <div className="bg-white rounded-lg border border-zinc-200 p-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">From</p>
                <p className="font-semibold text-zinc-900">{org.name}</p>
                {org.email && <p className="text-sm text-zinc-500 mt-0.5">{org.email}</p>}
                {org.address && <p className="text-sm text-zinc-500">{org.address}</p>}
                {(org.city || org.postcode) && <p className="text-sm text-zinc-500">{[org.city, org.postcode].filter(Boolean).join(', ')}</p>}
                {org.country && <p className="text-sm text-zinc-500">{org.country}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">To</p>
                {quote.client ? (
                  <>
                    <p className="font-semibold text-zinc-900">{quote.client.name}</p>
                    {quote.client.company && <p className="text-sm text-zinc-500 mt-0.5">{quote.client.company}</p>}
                    {quote.client.email && <p className="text-sm text-zinc-500">{quote.client.email}</p>}
                    {quote.client.address && <p className="text-sm text-zinc-500">{quote.client.address}</p>}
                    {(quote.client.city || quote.client.postcode) && (
                      <p className="text-sm text-zinc-500">{[quote.client.city, quote.client.postcode].filter(Boolean).join(', ')}</p>
                    )}
                    {quote.client.country && <p className="text-sm text-zinc-500">{quote.client.country}</p>}
                  </>
                ) : (
                  <p className="text-sm text-zinc-400">No client assigned</p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-6 py-3">Description</th>
                  <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-3">Qty</th>
                  <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-3">Unit Price</th>
                  <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide px-6 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-400">No line items</td></tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-zinc-900">{item.description}</td>
                      <td className="px-4 py-4 text-right text-zinc-500">{item.quantity}</td>
                      <td className="px-4 py-4 text-right text-zinc-500">{formatMoney(item.unit_price, quote.currency)}</td>
                      <td className="px-6 py-4 text-right font-medium text-zinc-900">{formatMoney(item.amount, quote.currency)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="border-t border-zinc-100 px-6 py-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2.5">
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>Subtotal</span><span>{formatMoney(quote.subtotal, quote.currency)}</span>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>Discount</span><span>-{formatMoney(quote.discount, quote.currency)}</span>
                    </div>
                  )}
                  {quote.tax_rate > 0 && (
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>{org.tax_name} ({quote.tax_rate}%)</span>
                      <span>{formatMoney(quote.tax_amount, quote.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-zinc-900 pt-2.5 border-t border-zinc-200">
                    <span>Total</span><span>{formatMoney(quote.total, quote.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(quote.notes || quote.terms) && (
            <div className="bg-white rounded-lg border border-zinc-200 p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {quote.notes && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-sm text-zinc-500 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Terms</p>
                  <p className="text-sm text-zinc-500 whitespace-pre-wrap">{quote.terms}</p>
                </div>
              )}
            </div>
          )}

          {quote.converted_invoice_id && (
            <div className="bg-emerald-50 rounded-lg border border-emerald-200 px-5 py-4">
              <p className="text-sm text-emerald-700">
                This quote was converted to an invoice.{' '}
                <Link href={`/invoices/${quote.converted_invoice_id}`} className="font-medium underline hover:no-underline">
                  View invoice →
                </Link>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-lg border border-zinc-200 p-5">
            <h3 className="text-sm font-medium text-zinc-900 mb-4">Quote Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-zinc-400">Issue Date</dt>
                <dd className="font-medium text-zinc-900">{formatDate(quote.issue_date)}</dd>
              </div>
              {quote.expiry_date && (
                <div className="flex justify-between text-sm">
                  <dt className="text-zinc-400">Expiry Date</dt>
                  <dd className="font-medium text-zinc-900">{formatDate(quote.expiry_date)}</dd>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <dt className="text-zinc-400">Currency</dt>
                <dd className="font-medium text-zinc-900">{quote.currency}</dd>
              </div>
              {quote.sent_at && (
                <div className="flex justify-between text-sm">
                  <dt className="text-zinc-400">Sent</dt>
                  <dd className="font-medium text-zinc-900">{formatDate(quote.sent_at)}</dd>
                </div>
              )}
              {quote.accepted_at && (
                <div className="flex justify-between text-sm">
                  <dt className="text-zinc-400">Accepted</dt>
                  <dd className="font-medium text-zinc-900">{formatDate(quote.accepted_at)}</dd>
                </div>
              )}
            </dl>
          </div>

          <QuoteStatusActions
            quoteId={quote.id}
            orgId={org.id}
            currentStatus={quote.status}
            quoteNumber={quote.quote_number}
            clientEmail={quote.client?.email}
          />
        </div>
      </div>
    </div>
  )
}
