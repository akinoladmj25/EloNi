import { Resend } from 'resend'
import { formatMoney, formatDate } from './utils'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'EloNi <noreply@eloni.app>'

interface OrgData {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
}

interface ClientData {
  name: string
  email: string
  company?: string | null
  address?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
}

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order?: number
}

interface EmailData {
  docNumber: string
  docType: 'Invoice' | 'Quote'
  issueDate: string
  dueOrExpiryDate?: string | null
  dueOrExpiryLabel?: string
  currency: string
  subtotal: number
  discount?: number
  taxRate?: number
  taxAmount?: number
  taxName?: string
  total: number
  notes?: string | null
  terms?: string | null
  items: LineItem[]
  org: OrgData
  client: ClientData
}

function buildItemsHtml(items: LineItem[], currency: string): string {
  const rows = items
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(
      item => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;">${item.description}</td>
      <td style="padding:10px 8px;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f1f5f9;">${item.quantity}</td>
      <td style="padding:10px 8px;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f1f5f9;">${formatMoney(item.unit_price, currency)}</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f1f5f9;">${formatMoney(item.amount, currency)}</td>
    </tr>`,
    )
    .join('')

  return rows
}

function buildEmailHtml(data: EmailData): string {
  const {
    docNumber, docType, issueDate, dueOrExpiryDate, dueOrExpiryLabel,
    currency, subtotal, discount = 0, taxRate = 0, taxAmount = 0,
    taxName = 'Tax', total, notes, terms, items, org, client,
  } = data

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${docType} ${docNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:#18181b;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="display:inline-block;background:white;border-radius:6px;padding:5px 9px;margin-bottom:8px;">
                  <span style="font-size:10px;font-weight:900;color:#18181b;letter-spacing:-0.05em;">ELN</span>
                </div>
                <div style="font-size:19px;font-weight:700;color:white;line-height:1.2;">${org.name}</div>
                ${org.email ? `<div style="font-size:12px;color:#a1a1aa;margin-top:3px;">${org.email}</div>` : ''}
              </td>
              <td align="right" style="vertical-align:top;">
                <div style="font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${docType}</div>
                <div style="font-size:20px;font-weight:800;color:white;">${docNumber}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- From / To -->
      <tr>
        <td style="background:white;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:50%;vertical-align:top;padding-right:12px;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:8px;">From</div>
                <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:2px;">${org.name}</div>
                ${org.email ? `<div style="font-size:12px;color:#6b7280;">${org.email}</div>` : ''}
                ${org.phone ? `<div style="font-size:12px;color:#6b7280;">${org.phone}</div>` : ''}
                ${org.address ? `<div style="font-size:12px;color:#6b7280;">${org.address}</div>` : ''}
                ${(org.city || org.postcode) ? `<div style="font-size:12px;color:#6b7280;">${[org.city, org.postcode].filter(Boolean).join(', ')}</div>` : ''}
                ${org.country ? `<div style="font-size:12px;color:#6b7280;">${org.country}</div>` : ''}
              </td>
              <td style="width:50%;vertical-align:top;padding-left:12px;border-left:1px solid #f4f4f5;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:8px;">${docType === 'Invoice' ? 'Bill To' : 'Prepared For'}</div>
                <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:2px;">${client.name}</div>
                ${client.company ? `<div style="font-size:12px;color:#6b7280;">${client.company}</div>` : ''}
                <div style="font-size:12px;color:#6b7280;">${client.email}</div>
                ${client.address ? `<div style="font-size:12px;color:#6b7280;">${client.address}</div>` : ''}
                ${(client.city || client.postcode) ? `<div style="font-size:12px;color:#6b7280;">${[client.city, client.postcode].filter(Boolean).join(', ')}</div>` : ''}
                ${client.country ? `<div style="font-size:12px;color:#6b7280;">${client.country}</div>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Dates -->
      <tr>
        <td style="background:#f9fafb;border-top:1px solid #f1f5f9;padding:14px 32px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:32px;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:3px;">Issue Date</div>
                <div style="font-size:13px;font-weight:600;color:#111827;">${formatDate(issueDate)}</div>
              </td>
              ${dueOrExpiryDate ? `
              <td style="padding-right:32px;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:3px;">${dueOrExpiryLabel ?? 'Due Date'}</div>
                <div style="font-size:13px;font-weight:600;color:#111827;">${formatDate(dueOrExpiryDate)}</div>
              </td>` : ''}
              <td>
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:3px;">Currency</div>
                <div style="font-size:13px;font-weight:600;color:#111827;">${currency}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Line items -->
      <tr>
        <td style="background:white;border-top:1px solid #f1f5f9;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
                <th style="text-align:left;padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">Description</th>
                <th style="text-align:right;padding:10px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;width:50px;">Qty</th>
                <th style="text-align:right;padding:10px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;width:90px;">Price</th>
                <th style="text-align:right;padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;width:90px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${buildItemsHtml(items, currency)}
            </tbody>
          </table>
        </td>
      </tr>

      <!-- Totals -->
      <tr>
        <td style="background:white;padding:0 32px 20px;">
          <table align="right" cellpadding="0" cellspacing="0" style="min-width:200px;">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;padding-right:24px;">Subtotal</td>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;text-align:right;">${formatMoney(subtotal, currency)}</td>
            </tr>
            ${discount > 0 ? `
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#6b7280;padding-right:24px;">Discount</td>
              <td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;">-${formatMoney(discount, currency)}</td>
            </tr>` : ''}
            ${taxRate > 0 ? `
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#6b7280;padding-right:24px;">${taxName} (${taxRate}%)</td>
              <td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;">${formatMoney(taxAmount, currency)}</td>
            </tr>` : ''}
            <tr style="border-top:2px solid #e5e7eb;">
              <td style="padding:10px 24px 4px 0;font-size:15px;font-weight:700;color:#111827;">Total (${currency})</td>
              <td style="padding:10px 0 4px;font-size:15px;font-weight:700;color:#111827;text-align:right;">${formatMoney(total, currency)}</td>
            </tr>
          </table>
        </td>
      </tr>

      ${(notes || terms) ? `
      <!-- Notes / Terms -->
      <tr>
        <td style="background:#f9fafb;border-top:1px solid #f1f5f9;padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${notes ? `
              <td style="vertical-align:top;padding-right:${terms ? '16px' : '0'};">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:6px;">Notes</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.6;">${notes.replace(/\n/g, '<br>')}</div>
              </td>` : ''}
              ${terms ? `
              <td style="vertical-align:top;padding-left:${notes ? '16px' : '0'};">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:6px;">${docType === 'Invoice' ? 'Payment Terms' : 'Terms & Conditions'}</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.6;">${terms.replace(/\n/g, '<br>')}</div>
              </td>` : ''}
            </tr>
          </table>
        </td>
      </tr>` : ''}

      <!-- Footer -->
      <tr>
        <td style="background:#18181b;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#71717a;">Sent via EloNi &mdash; Know the price. Send the invoice. Get paid.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function sendInvoiceEmail(params: {
  invoiceNumber: string
  issueDate: string
  dueDate?: string | null
  currency: string
  subtotal: number
  discount?: number
  taxRate?: number
  taxAmount?: number
  taxName?: string | null
  total: number
  notes?: string | null
  terms?: string | null
  items: LineItem[]
  org: OrgData
  client: ClientData
}) {
  const html = buildEmailHtml({
    docNumber: params.invoiceNumber,
    docType: 'Invoice',
    issueDate: params.issueDate,
    dueOrExpiryDate: params.dueDate,
    dueOrExpiryLabel: 'Due Date',
    currency: params.currency,
    subtotal: params.subtotal,
    discount: params.discount,
    taxRate: params.taxRate,
    taxAmount: params.taxAmount,
    taxName: params.taxName ?? 'Tax',
    total: params.total,
    notes: params.notes,
    terms: params.terms,
    items: params.items,
    org: params.org,
    client: params.client,
  })

  return resend.emails.send({
    from: FROM,
    to: [params.client.email],
    replyTo: params.org.email ?? undefined,
    subject: `Invoice ${params.invoiceNumber} from ${params.org.name}`,
    html,
  })
}

export async function sendThankYouEmail(params: {
  invoiceNumber: string
  paidAt?: string | null
  currency: string
  total: number
  org: OrgData
  client: ClientData
  receiptUrl?: string | null
}) {
  const { invoiceNumber, paidAt, currency, total, org, client, receiptUrl } = params

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thank You — ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:36px 32px;text-align:center;">
          <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:28px;line-height:56px;display:block;">✓</span>
          </div>
          <div style="font-size:24px;font-weight:800;color:white;margin-bottom:6px;">Thank you, ${client.name}!</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.8);">Your payment has been received.</div>
        </td>
      </tr>

      <!-- From -->
      <tr>
        <td style="background:white;padding:24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-size:13px;color:#6b7280;margin-bottom:2px;">From</div>
                <div style="font-size:15px;font-weight:700;color:#111827;">${org.name}</div>
                ${org.email ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${org.email}</div>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Payment summary -->
      <tr>
        <td style="background:white;padding:20px 32px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#16a34a;margin-bottom:4px;">Payment Received</div>
                  <div style="font-size:13px;color:#374151;">Invoice ${invoiceNumber}${paidAt ? ` · Paid ${formatDate(paidAt)}` : ''}</div>
                </td>
                <td style="text-align:right;vertical-align:middle;">
                  <div style="font-size:26px;font-weight:800;color:#16a34a;font-variant-numeric:tabular-nums;">${formatMoney(total, currency)}</div>
                  <div style="font-size:11px;color:#6b7280;">${currency}</div>
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- Message -->
      <tr>
        <td style="background:white;padding:0 32px 28px;">
          <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">
            We really appreciate your prompt payment. It means a lot to us and helps us continue delivering great work for you.
          </p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
            If you need a receipt or have any questions, please don't hesitate to reach out${org.email ? ` at <a href="mailto:${org.email}" style="color:#16a34a;text-decoration:none;">${org.email}</a>` : ''}.
          </p>
          ${receiptUrl ? `
          <div style="margin-top:20px;text-align:center;">
            <a href="${receiptUrl}" style="display:inline-block;background:#16a34a;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">Download Receipt</a>
          </div>` : ''}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#18181b;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#71717a;">Sent via EloNi &mdash; Know the price. Send the invoice. Get paid.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to: [client.email],
    replyTo: org.email ?? undefined,
    subject: `Thank you for your payment — ${invoiceNumber}`,
    html,
  })
}

export async function sendQuoteEmail(params: {
  quoteNumber: string
  issueDate: string
  expiryDate?: string | null
  currency: string
  subtotal: number
  discount?: number
  taxRate?: number
  taxAmount?: number
  taxName?: string | null
  total: number
  notes?: string | null
  terms?: string | null
  items: LineItem[]
  org: OrgData
  client: ClientData
}) {
  const html = buildEmailHtml({
    docNumber: params.quoteNumber,
    docType: 'Quote',
    issueDate: params.issueDate,
    dueOrExpiryDate: params.expiryDate,
    dueOrExpiryLabel: 'Valid Until',
    currency: params.currency,
    subtotal: params.subtotal,
    discount: params.discount,
    taxRate: params.taxRate,
    taxAmount: params.taxAmount,
    taxName: params.taxName ?? 'Tax',
    total: params.total,
    notes: params.notes,
    terms: params.terms,
    items: params.items,
    org: params.org,
    client: params.client,
  })

  return resend.emails.send({
    from: FROM,
    to: [params.client.email],
    replyTo: params.org.email ?? undefined,
    subject: `Quote ${params.quoteNumber} from ${params.org.name}`,
    html,
  })
}
