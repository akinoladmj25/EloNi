import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import type { Invoice, InvoiceItem, Client, Organisation } from '@/types'

export async function generateMetadata() {
  return { title: 'Print Receipt' }
}

export default async function PrintReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations').select('*').eq('user_id', user.id).single() as { data: Organisation | null }
  if (!org) redirect('/settings')

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, client:clients(*), items:invoice_items(*)')
    .eq('id', id)
    .eq('org_id', org.id)
    .eq('status', 'paid')
    .single() as { data: (Invoice & { client: Client | null; items: InvoiceItem[] }) | null }

  if (!invoice) notFound()

  const items = (invoice.items ?? []).sort((a, b) => a.sort_order - b.sort_order)
  const currency = invoice.currency

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Receipt — {invoice.invoice_number} — EloNi</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { font-size: 14px; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #0f172a; background: #f8fafc; padding: 24px; }
          .page { background: #fff; max-width: 800px; margin: 0 auto; padding: 48px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .print-btn { display: block; text-align: center; margin-bottom: 24px; max-width: 800px; margin-left: auto; margin-right: auto; }
          .print-btn button { background: #16a34a; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
          .print-btn button:hover { background: #15803d; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
          .logo-box { width: 40px; height: 40px; background: #18181b; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
          .logo-box span { color: white; font-size: 20px; font-weight: 700; }
          .brand-name { font-size: 20px; font-weight: 700; color: #0f172a; }
          .paid-stamp { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 8px 20px; text-align: right; }
          .paid-stamp .label { font-size: 22px; font-weight: 800; color: #16a34a; letter-spacing: 0.05em; }
          .paid-stamp .ref { font-size: 13px; color: #64748b; margin-top: 2px; }
          .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
          .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
          .party-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
          .party-detail { font-size: 13px; color: #64748b; margin-bottom: 1px; }
          .dates { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 32px; border: 1px solid #bbf7d0; }
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
          .totals-row.total { border-top: 2px solid #16a34a; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; color: #16a34a; }
          .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
          @media print { body { background: white; padding: 0; } .page { box-shadow: none; border-radius: 0; padding: 32px; max-width: 100%; } .no-print { display: none !important; } }
        `}</style>
      </head>
      <body>
        <div className="print-btn no-print">
          <button>Save as PDF / Print</button>
        </div>
        <div className="page">
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <div className="paid-stamp">
              <div className="label">RECEIPT</div>
              <div className="ref">{invoice.invoice_number}</div>
            </div>
          </div>

          <div className="parties">
            <div>
              <div className="party-label">From</div>
              <div className="party-name">{org.name}</div>
              {org.email && <div className="party-detail">{org.email}</div>}
              {org.phone && <div className="party-detail">{org.phone}</div>}
              {org.address && <div className="party-detail">{org.address}</div>}
              {(org.city || org.postcode) && <div className="party-detail">{[org.city, org.postcode].filter(Boolean).join(', ')}</div>}
              {org.country && <div className="party-detail">{org.country}</div>}
            </div>
            <div>
              <div className="party-label">Receipt For</div>
              {invoice.client ? (
                <>
                  <div className="party-name">{invoice.client.name}</div>
                  {invoice.client.company && <div className="party-detail">{invoice.client.company}</div>}
                  {invoice.client.email && <div className="party-detail">{invoice.client.email}</div>}
                  {invoice.client.address && <div className="party-detail">{invoice.client.address}</div>}
                  {(invoice.client.city || invoice.client.postcode) && <div className="party-detail">{[invoice.client.city, invoice.client.postcode].filter(Boolean).join(', ')}</div>}
                  {invoice.client.country && <div className="party-detail">{invoice.client.country}</div>}
                </>
              ) : (
                <div className="party-detail">No client assigned</div>
              )}
            </div>
          </div>

          <div className="dates">
            <div>
              <div className="date-label">Invoice Number</div>
              <div className="date-value">{invoice.invoice_number}</div>
            </div>
            <div>
              <div className="date-label">Invoice Date</div>
              <div className="date-value">{formatDate(invoice.issue_date)}</div>
            </div>
            <div>
              <div className="date-label">Date Paid</div>
              <div className="date-value" style={{ color: '#16a34a', fontWeight: 700 }}>
                {invoice.paid_at ? formatDate(invoice.paid_at) : '—'}
              </div>
            </div>
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
                  <span>{org.tax_name} ({invoice.tax_rate}%)</span>
                  <span>{formatMoney(invoice.tax_amount, currency)}</span>
                </div>
              )}
              <div className="totals-row total">
                <span>Amount Paid ({currency})</span>
                <span>{formatMoney(invoice.total, currency)}</span>
              </div>
            </div>
          </div>

          <div className="footer">
            Thank you for your payment &mdash; Generated by EloNi
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `document.querySelector('.print-btn button')?.addEventListener('click', function() { window.print(); });` }} />
      </body>
    </html>
  )
}
