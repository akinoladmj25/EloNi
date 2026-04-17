import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate, getCurrencySymbol } from '@/lib/utils'
import type { Invoice, InvoiceItem, Client, Organisation } from '@/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Print Invoice` }
}

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: Organisation | null }

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

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{invoice.invoice_number} — EloNi Invoice</title>
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
          .print-btn {
            display: block;
            text-align: center;
            margin-bottom: 24px;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
          }
          .print-btn button {
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          }
          .print-btn button:hover { background: #1d4ed8; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
          .logo-area { display: flex; align-items: center; gap: 12px; }
          .logo-box {
            width: 40px; height: 40px; background: #2563eb;
            border-radius: 8px; display: flex; align-items: center; justify-content: center;
          }
          .logo-box span { color: white; font-size: 20px; font-weight: 700; }
          .brand-name { font-size: 20px; font-weight: 700; color: #0f172a; }
          .invoice-meta { text-align: right; }
          .invoice-number { font-size: 22px; font-weight: 700; color: #0f172a; }
          .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border: 1px solid;
            margin-top: 4px;
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
          tbody tr:last-child { border-bottom: none; }
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
        `}</style>
      </head>
      <body>
        <div className="print-btn no-print">
          <button>Save as PDF / Print</button>
        </div>

        <div className="page">
          {/* Header */}
          <div className="header">
            <div className="logo-area">
              {org.logo_url ? (
                <img src={org.logo_url} alt={org.name} style={{ height: '40px', maxWidth: '120px', objectFit: 'contain' }} />
              ) : (
                <div className="logo-box"><span>E</span></div>
              )}
              <div>
                <div className="brand-name">{org.name}</div>
                {org.email && <div style={{ fontSize: '12px', color: '#64748b' }}>{org.email}</div>}
              </div>
            </div>
            <div className="invoice-meta">
              <div className="invoice-number">INVOICE</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>{invoice.invoice_number}</div>
              <div
                className="status-badge"
                style={{ color: statusColor, borderColor: statusColor, backgroundColor: `${statusColor}15` }}
              >
                {invoice.status}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="parties">
            <div>
              <div className="party-label">From</div>
              <div className="party-name">{org.name}</div>
              {org.email && <div className="party-detail">{org.email}</div>}
              {org.phone && <div className="party-detail">{org.phone}</div>}
              {org.address && <div className="party-detail">{org.address}</div>}
              {(org.city || org.postcode) && (
                <div className="party-detail">{[org.city, org.postcode].filter(Boolean).join(', ')}</div>
              )}
              {org.country && <div className="party-detail">{org.country}</div>}
            </div>
            <div>
              <div className="party-label">Bill To</div>
              {invoice.client ? (
                <>
                  <div className="party-name">{invoice.client.name}</div>
                  {invoice.client.company && <div className="party-detail">{invoice.client.company}</div>}
                  {invoice.client.email && <div className="party-detail">{invoice.client.email}</div>}
                  {invoice.client.phone && <div className="party-detail">{invoice.client.phone}</div>}
                  {invoice.client.address && <div className="party-detail">{invoice.client.address}</div>}
                  {(invoice.client.city || invoice.client.postcode) && (
                    <div className="party-detail">{[invoice.client.city, invoice.client.postcode].filter(Boolean).join(', ')}</div>
                  )}
                  {invoice.client.country && <div className="party-detail">{invoice.client.country}</div>}
                </>
              ) : (
                <div className="party-detail">No client assigned</div>
              )}
            </div>
          </div>

          {/* Dates */}
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

          {/* Line Items */}
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

          {/* Totals */}
          <div className="totals">
            <div className="totals-inner">
              <div className="totals-row">
                <span>Subtotal</span>
                <span>{formatMoney(invoice.subtotal, currency)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="totals-row">
                  <span>Discount</span>
                  <span>-{formatMoney(invoice.discount, currency)}</span>
                </div>
              )}
              {invoice.tax_rate > 0 && (
                <div className="totals-row">
                  <span>{org.tax_name} ({invoice.tax_rate}%)</span>
                  <span>{formatMoney(invoice.tax_amount, currency)}</span>
                </div>
              )}
              <div className="totals-row total">
                <span>Total ({currency})</span>
                <span>{formatMoney(invoice.total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
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

          <div className="footer">
            Generated by EloNi &mdash; Know the price. Send the invoice. Get paid.
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelector('.print-btn button')?.addEventListener('click', function() {
            window.print();
          });
        ` }} />
      </body>
    </html>
  )
}
