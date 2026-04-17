import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import type { Invoice, InvoiceItem, Client, Organisation } from '@/types'
import PaymentButtons from '@/components/PaymentButtons'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  return { title: 'Invoice' }
}

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paid?: string; reference?: string }>
}) {
  const { token } = await params
  const { paid, reference } = await searchParams
  const supabase = await createClient()

  // Query by public_token — anon policy allows this
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, client:clients(*), items:invoice_items(*), org:organisations(*)')
    .eq('public_token', token)
    .single() as {
      data: (Invoice & {
        client: Client | null
        items: InvoiceItem[]
        org: Organisation | null
      }) | null
    }

  if (!invoice) notFound()

  // Record first view — anon update policy allows this
  if (!invoice.client_viewed_at) {
    await supabase
      .from('invoices')
      .update({ client_viewed_at: new Date().toISOString() })
      .eq('public_token', token)
  }

  // If redirected back from Paystack with reference, verify the payment
  if (paid === 'paystack' && reference && invoice.status !== 'paid') {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    await fetch(`${baseUrl}/api/payment/paystack/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, token }),
    }).catch(() => null)

    // Re-fetch to get updated status
    const { data: updated } = await supabase
      .from('invoices')
      .select('status, paid_at')
      .eq('public_token', token)
      .single()
    if (updated?.status === 'paid') {
      (invoice as any).status = 'paid'
    }
  }

  const org = invoice.org
  const items = (invoice.items ?? []).sort((a, b) => a.sort_order - b.sort_order)
  const currency = invoice.currency

  const STATUS_COLORS: Record<string, string> = {
    draft: '#6b7280',
    sent: '#2563eb',
    paid: '#16a34a',
    overdue: '#dc2626',
    cancelled: '#374151',
  }
  const statusColor = STATUS_COLORS[invoice.status] ?? '#6b7280'

  const isUnpaid = invoice.status === 'sent' || invoice.status === 'overdue'
  const hasStripe = !!org?.stripe_secret_key
  const hasPayPal = !!(org?.paypal_client_id && org?.paypal_client_secret)
  const hasPaystack = !!org?.paystack_secret_key
  const showPaymentButtons = isUnpaid && (hasStripe || hasPayPal || hasPaystack)
  const justPaid = !!paid

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{invoice.invoice_number} — Invoice</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { font-size: 14px; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #f8fafc;
            padding: 24px;
          }
          .page {
            background: #fff;
            max-width: 800px;
            margin: 0 auto;
            padding: 48px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .print-bar {
            max-width: 800px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .print-bar p { font-size: 13px; color: #64748b; }
          .print-btn {
            background: #18181b; color: white; border: none;
            padding: 8px 20px; border-radius: 6px; font-size: 13px;
            font-weight: 600; cursor: pointer; white-space: nowrap;
          }
          .print-btn:hover { background: #27272a; }
          .paid-banner {
            max-width: 800px; margin: 0 auto 20px;
            background: #f0fdf4; border: 1px solid #86efac;
            border-radius: 8px; padding: 14px 20px;
            display: flex; align-items: center; gap: 10px;
          }
          .paid-banner-text { font-size: 13px; color: #16a34a; font-weight: 600; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
          .logo-box { width: 40px; height: 40px; background: #18181b; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
          .logo-box span { color: white; font-size: 14px; font-weight: 800; }
          .brand-name { font-size: 18px; font-weight: 700; color: #0f172a; }
          .invoice-meta { text-align: right; }
          .invoice-number { font-size: 22px; font-weight: 700; color: #0f172a; }
          .status-badge {
            display: inline-block; padding: 3px 10px; border-radius: 6px;
            font-size: 11px; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.05em; border: 1px solid; margin-top: 4px;
          }
          .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
          .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
          .party-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
          .party-detail { font-size: 13px; color: #64748b; margin-bottom: 1px; }
          .dates { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 32px; }
          .date-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px; }
          .date-value { font-size: 13px; font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead tr { border-bottom: 2px solid #e2e8f0; }
          th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; padding: 8px 12px 10px; }
          th.right { text-align: right; }
          tbody tr { border-bottom: 1px solid #f1f5f9; }
          td { padding: 12px; font-size: 13px; color: #374151; }
          td.right { text-align: right; }
          td.bold { font-weight: 600; color: #0f172a; }
          .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
          .totals-inner { width: 260px; }
          .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #64748b; }
          .totals-row.total { border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; color: #0f172a; }
          .notes-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
          .notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
          .notes-text { font-size: 13px; color: #64748b; white-space: pre-wrap; line-height: 1.6; }
          .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
          @media print {
            body { background: white; padding: 0; }
            .page { box-shadow: none; border-radius: 0; padding: 32px; max-width: 100%; }
            .no-print { display: none !important; }
          }
          @media (max-width: 600px) {
            body { padding: 12px; }
            .page { padding: 24px 16px; }
            .parties { grid-template-columns: 1fr; gap: 20px; }
            .dates { grid-template-columns: 1fr 1fr; }
            .notes-section { grid-template-columns: 1fr; }
          }
        `}</style>
      </head>
      <body>
        <div className="print-bar no-print">
          <p>Invoice from {org?.name ?? 'your vendor'}</p>
          <button className="print-btn">Save as PDF / Print</button>
        </div>

        {justPaid && (
          <div className="paid-banner no-print">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="paid-banner-text">Payment received — thank you! This invoice has been marked as paid.</span>
          </div>
        )}

        {showPaymentButtons && (
          <PaymentButtons
            token={token}
            hasStripe={hasStripe}
            hasPayPal={hasPayPal}
            hasPaystack={hasPaystack}
            invoiceTotal={formatMoney(invoice.total, currency)}
          />
        )}

        <div className="page">
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {org?.logo_url ? (
                <img src={org.logo_url} alt={org.name} style={{ height: '40px', maxWidth: '120px', objectFit: 'contain' }} />
              ) : (
                <div className="logo-box"><span>E</span></div>
              )}
              <div>
                <div className="brand-name">{org?.name}</div>
                {org?.email && <div style={{ fontSize: '12px', color: '#64748b' }}>{org.email}</div>}
              </div>
            </div>
            <div className="invoice-meta">
              <div className="invoice-number">INVOICE</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>{invoice.invoice_number}</div>
              <div className="status-badge" style={{ color: statusColor, borderColor: statusColor, backgroundColor: `${statusColor}15` }}>
                {invoice.status}
              </div>
            </div>
          </div>

          <div className="parties">
            <div>
              <div className="party-label">From</div>
              <div className="party-name">{org?.name}</div>
              {org?.email && <div className="party-detail">{org.email}</div>}
              {org?.phone && <div className="party-detail">{org.phone}</div>}
              {org?.address && <div className="party-detail">{org.address}</div>}
              {(org?.city || org?.postcode) && (
                <div className="party-detail">{[org.city, org.postcode].filter(Boolean).join(', ')}</div>
              )}
              {org?.country && <div className="party-detail">{org.country}</div>}
            </div>
            <div>
              <div className="party-label">Bill To</div>
              {invoice.client ? (
                <>
                  <div className="party-name">{invoice.client.name}</div>
                  {invoice.client.company && <div className="party-detail">{invoice.client.company}</div>}
                  {invoice.client.email && <div className="party-detail">{invoice.client.email}</div>}
                  {invoice.client.address && <div className="party-detail">{invoice.client.address}</div>}
                  {(invoice.client.city || invoice.client.postcode) && (
                    <div className="party-detail">{[invoice.client.city, invoice.client.postcode].filter(Boolean).join(', ')}</div>
                  )}
                  {invoice.client.country && <div className="party-detail">{invoice.client.country}</div>}
                </>
              ) : (
                <div className="party-detail">—</div>
              )}
            </div>
          </div>

          <div className="dates">
            <div>
              <div className="date-label">Invoice Number</div>
              <div className="date-value">{invoice.invoice_number}</div>
            </div>
            <div>
              <div className="date-label">Issue Date</div>
              <div className="date-value">{formatDate(invoice.issue_date)}</div>
            </div>
            {invoice.due_date && (
              <div>
                <div className="date-label">Due Date</div>
                <div className="date-value">{formatDate(invoice.due_date)}</div>
              </div>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th className="right" style={{ width: '80px' }}>Qty</th>
                <th className="right" style={{ width: '120px' }}>Unit Price</th>
                <th className="right" style={{ width: '120px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>No items</td></tr>
              ) : (
                items.map(item => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td className="right">{item.quantity}</td>
                    <td className="right">{formatMoney(item.unit_price, currency)}</td>
                    <td className="right bold">{formatMoney(item.amount, currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="totals">
            <div className="totals-inner">
              <div className="totals-row"><span>Subtotal</span><span>{formatMoney(invoice.subtotal, currency)}</span></div>
              {invoice.discount > 0 && (
                <div className="totals-row"><span>Discount</span><span>-{formatMoney(invoice.discount, currency)}</span></div>
              )}
              {invoice.tax_rate > 0 && (
                <div className="totals-row">
                  <span>Tax ({invoice.tax_rate}%)</span>
                  <span>{formatMoney(invoice.tax_amount, currency)}</span>
                </div>
              )}
              <div className="totals-row total">
                <span>Total ({currency})</span>
                <span>{formatMoney(invoice.total, currency)}</span>
              </div>
            </div>
          </div>

          {(invoice.notes || invoice.terms) && (
            <div className="notes-section">
              {invoice.notes && (
                <div>
                  <div className="notes-label">Notes</div>
                  <div className="notes-text">{invoice.notes}</div>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <div className="notes-label">Payment Terms</div>
                  <div className="notes-text">{invoice.terms}</div>
                </div>
              )}
            </div>
          )}

          <div className="footer">Generated by EloNi &mdash; Know the price. Send the invoice. Get paid.</div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelector('.print-btn')?.addEventListener('click', function() { window.print(); });
        ` }} />
      </body>
    </html>
  )
}
