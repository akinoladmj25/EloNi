import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import type { Quote, QuoteItem, Client, Organisation } from '@/types'
import AcceptQuoteButton from './AcceptQuoteButton'

export const metadata = { title: 'Quote' }

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, client:clients(*), items:quote_items(*), org:organisations(*)')
    .eq('public_token', token)
    .single() as {
      data: (Quote & {
        client: Client | null
        items: QuoteItem[]
        org: Organisation | null
      }) | null
    }

  if (!quote) notFound()

  const org = quote.org
  const items = (quote.items ?? []).sort((a, b) => a.sort_order - b.sort_order)
  const currency = quote.currency

  const STATUS_COLORS: Record<string, string> = {
    draft:    '#6b7280',
    sent:     '#2563eb',
    accepted: '#16a34a',
    declined: '#dc2626',
    expired:  '#374151',
  }
  const statusColor = STATUS_COLORS[quote.status] ?? '#6b7280'

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{quote.quote_number} — Quote</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { font-size: 14px; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            color: #0f172a; background: #f8fafc; padding: 24px;
          }
          .page {
            background: #fff; max-width: 800px; margin: 0 auto; padding: 48px;
            border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .top-bar { max-width: 800px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
          .top-bar p { font-size: 13px; color: #64748b; }
          .accept-area { display: flex; gap: 8px; flex-wrap: wrap; }
          .btn { padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; white-space: nowrap; }
          .btn-accept { background: #16a34a; color: white; }
          .btn-accept:hover { background: #15803d; }
          .btn-print { background: #18181b; color: white; }
          .btn-print:hover { background: #27272a; }
          .btn-decline { background: transparent; color: #dc2626; border: 1px solid #dc2626; }
          .btn-decline:hover { background: #fef2f2; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
          .logo-box { width: 40px; height: 40px; background: #18181b; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
          .logo-box span { color: white; font-size: 14px; font-weight: 800; }
          .brand-name { font-size: 18px; font-weight: 700; color: #0f172a; }
          .quote-meta { text-align: right; }
          .quote-number { font-size: 22px; font-weight: 700; color: #0f172a; }
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
          .accepted-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; text-align: center; font-size: 14px; font-weight: 600; color: #15803d; }
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
        <div className="top-bar no-print">
          <p>Quote from {org?.name ?? 'your vendor'}</p>
          <div className="accept-area">
            {quote.status === 'sent' && (
              <AcceptQuoteButton quoteId={quote.id} token={token} />
            )}
            <button className="btn btn-print">Print / Save PDF</button>
          </div>
        </div>

        <div className="page">
          {quote.status === 'accepted' && (
            <div className="accepted-banner">✓ You have accepted this quote</div>
          )}

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
            <div className="quote-meta">
              <div className="quote-number">QUOTE</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>{quote.quote_number}</div>
              <div className="status-badge" style={{ color: statusColor, borderColor: statusColor, backgroundColor: `${statusColor}15` }}>
                {quote.status}
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
              <div className="party-label">Prepared For</div>
              {quote.client ? (
                <>
                  <div className="party-name">{quote.client.name}</div>
                  {quote.client.company && <div className="party-detail">{quote.client.company}</div>}
                  {quote.client.email && <div className="party-detail">{quote.client.email}</div>}
                  {quote.client.address && <div className="party-detail">{quote.client.address}</div>}
                  {(quote.client.city || quote.client.postcode) && (
                    <div className="party-detail">{[quote.client.city, quote.client.postcode].filter(Boolean).join(', ')}</div>
                  )}
                  {quote.client.country && <div className="party-detail">{quote.client.country}</div>}
                </>
              ) : (
                <div className="party-detail">—</div>
              )}
            </div>
          </div>

          <div className="dates">
            <div>
              <div className="date-label">Quote Number</div>
              <div className="date-value">{quote.quote_number}</div>
            </div>
            <div>
              <div className="date-label">Issue Date</div>
              <div className="date-value">{formatDate(quote.issue_date)}</div>
            </div>
            {quote.expiry_date && (
              <div>
                <div className="date-label">Valid Until</div>
                <div className="date-value">{formatDate(quote.expiry_date)}</div>
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
              <div className="totals-row"><span>Subtotal</span><span>{formatMoney(quote.subtotal, currency)}</span></div>
              {quote.discount > 0 && (
                <div className="totals-row"><span>Discount</span><span>-{formatMoney(quote.discount, currency)}</span></div>
              )}
              {quote.tax_rate > 0 && (
                <div className="totals-row">
                  <span>Tax ({quote.tax_rate}%)</span>
                  <span>{formatMoney(quote.tax_amount, currency)}</span>
                </div>
              )}
              <div className="totals-row total">
                <span>Total ({currency})</span>
                <span>{formatMoney(quote.total, currency)}</span>
              </div>
            </div>
          </div>

          {(quote.notes || quote.terms) && (
            <div className="notes-section">
              {quote.notes && (
                <div>
                  <div className="notes-label">Notes</div>
                  <div className="notes-text">{quote.notes}</div>
                </div>
              )}
              {quote.terms && (
                <div>
                  <div className="notes-label">Terms & Conditions</div>
                  <div className="notes-text">{quote.terms}</div>
                </div>
              )}
            </div>
          )}

          <div className="footer">Generated by EloNi &mdash; Know the price. Send the invoice. Get paid.</div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelector('.btn-print')?.addEventListener('click', function() { window.print(); });
        ` }} />
      </body>
    </html>
  )
}
