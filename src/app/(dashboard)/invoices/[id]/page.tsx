import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import { ChevronLeft, Printer, ExternalLink } from 'lucide-react'
import type { Invoice, InvoiceItem, Client } from '@/types'
import InvoiceStatusActions from './InvoiceStatusActions'
import DuplicateInvoiceButton from '@/components/DuplicateInvoiceButton'
import ShareInvoiceButton from '@/components/ShareInvoiceButton'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Invoice ${id.slice(0, 8)}` }
}

const STATUS: Record<string, string> = {
  draft: 'text-zinc-500 bg-zinc-100',
  sent: 'text-blue-700 bg-blue-50',
  paid: 'text-emerald-700 bg-emerald-50',
  overdue: 'text-red-700 bg-red-50',
  cancelled: 'text-zinc-400 bg-zinc-100',
}
function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium capitalize ${STATUS[status] ?? STATUS.draft}`}>{status}</span>
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!org) redirect('/settings')

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, client:clients(*), items:invoice_items(*)')
    .eq('id', id)
    .eq('org_id', org.id)
    .single() as {
      data: (Invoice & {
        client: Client | null
        items: InvoiceItem[]
      }) | null
    }

  if (!invoice) notFound()

  const items = invoice.items ?? []

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 mb-4 transition-colors">
          <ChevronLeft size={16} />
          Back to invoices
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="flex items-center gap-2 flex-wrap overflow-x-auto">
            <Link
              href={`/invoice/${invoice.id}/print`}
              target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Printer size={15} />
              Print / PDF
            </Link>
            {invoice.status === 'paid' && (
              <Link
                href={`/receipt/${invoice.id}/print`}
                target="_blank"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-emerald-200 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <Printer size={15} />
                Receipt
              </Link>
            )}
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <ExternalLink size={15} />
              Edit
            </Link>
            <DuplicateInvoiceButton invoiceId={invoice.id} orgId={org.id} />
            <ShareInvoiceButton invoiceId={invoice.id} publicToken={invoice.public_token ?? null} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main invoice */}
        <div className="lg:col-span-2 space-y-5">
          {/* From/To */}
          <div className="bg-white rounded-lg border border-zinc-200 p-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">From</p>
                <p className="font-semibold text-zinc-900">{org.name}</p>
                {org.email && <p className="text-sm text-zinc-500 mt-0.5">{org.email}</p>}
                {org.address && <p className="text-sm text-zinc-500">{org.address}</p>}
                {(org.city || org.postcode) && (
                  <p className="text-sm text-zinc-500">{[org.city, org.postcode].filter(Boolean).join(', ')}</p>
                )}
                {org.country && <p className="text-sm text-zinc-500">{org.country}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">To</p>
                {invoice.client ? (
                  <>
                    <p className="font-semibold text-zinc-900">{invoice.client.name}</p>
                    {invoice.client.company && <p className="text-sm text-zinc-500 mt-0.5">{invoice.client.company}</p>}
                    {invoice.client.email && <p className="text-sm text-zinc-500">{invoice.client.email}</p>}
                    {invoice.client.address && <p className="text-sm text-zinc-500">{invoice.client.address}</p>}
                    {(invoice.client.city || invoice.client.postcode) && (
                      <p className="text-sm text-zinc-500">
                        {[invoice.client.city, invoice.client.postcode].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {invoice.client.country && <p className="text-sm text-zinc-500">{invoice.client.country}</p>}
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
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-400">No line items</td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-zinc-900">{item.description}</td>
                      <td className="px-4 py-4 text-right text-zinc-500">{item.quantity}</td>
                      <td className="px-4 py-4 text-right text-zinc-500">{formatMoney(item.unit_price, invoice.currency)}</td>
                      <td className="px-6 py-4 text-right font-medium text-zinc-900">{formatMoney(item.amount, invoice.currency)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-zinc-100 px-6 py-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2.5">
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>Subtotal</span>
                    <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>Discount</span>
                      <span>-{formatMoney(invoice.discount, invoice.currency)}</span>
                    </div>
                  )}
                  {invoice.tax_rate > 0 && (
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>{org.tax_name} ({invoice.tax_rate}%)</span>
                      <span>{formatMoney(invoice.tax_amount, invoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-zinc-900 pt-2.5 border-t border-zinc-200">
                    <span>Total</span>
                    <span>{formatMoney(invoice.total, invoice.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="bg-white rounded-lg border border-zinc-200 p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {invoice.notes && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-sm text-zinc-500 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Payment Terms</p>
                  <p className="text-sm text-zinc-500 whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Details */}
          <div className="bg-white rounded-lg border border-zinc-200 p-5">
            <h3 className="text-sm font-medium text-zinc-900 mb-4">Invoice Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-zinc-400">Issue Date</dt>
                <dd className="font-medium text-zinc-900">{formatDate(invoice.issue_date)}</dd>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between text-sm">
                  <dt className="text-zinc-400">Due Date</dt>
                  <dd className="font-medium text-zinc-900">{formatDate(invoice.due_date)}</dd>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <dt className="text-zinc-400">Currency</dt>
                <dd className="font-medium text-zinc-900">{invoice.currency}</dd>
              </div>
              {invoice.sent_at && (
                <div className="flex justify-between text-sm">
                  <dt className="text-zinc-400">Sent</dt>
                  <dd className="font-medium text-zinc-900">{formatDate(invoice.sent_at)}</dd>
                </div>
              )}
              {invoice.paid_at && (
                <div className="flex justify-between text-sm">
                  <dt className="text-zinc-400">Paid</dt>
                  <dd className="font-medium text-zinc-900">{formatDate(invoice.paid_at)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status Actions */}
          <InvoiceStatusActions invoiceId={invoice.id} currentStatus={invoice.status} clientEmail={invoice.client?.email} />
        </div>
      </div>
    </div>
  )
}
