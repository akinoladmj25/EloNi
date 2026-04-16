import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { formatMoney, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Protect with CRON_SECRET so only Vercel cron can call this
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 503 })
  }

  const supabase = await createClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM_EMAIL ?? 'EloNi <noreply@eloni.app>'

  // Find all overdue invoices with a client email
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, currency, due_date, client:clients(name, email), org:organisations(name, email)')
    .eq('status', 'overdue')
    .not('client', 'is', null)

  if (error) {
    console.error('Cron reminder error fetching invoices:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const toRemind = (invoices ?? []).filter(
    (i: any) => i.client?.email
  )

  let sent = 0
  for (const inv of toRemind as any[]) {
    try {
      await resend.emails.send({
        from: FROM,
        to: [inv.client.email],
        replyTo: inv.org?.email ?? undefined,
        subject: `Payment reminder: Invoice ${inv.invoice_number} from ${inv.org?.name ?? 'your supplier'}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:#18181b;padding:24px 32px;">
          <div style="font-size:19px;font-weight:700;color:white;">${inv.org?.name ?? 'Your supplier'}</div>
        </td>
      </tr>
      <tr>
        <td style="background:white;padding:32px;">
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#dc2626;">Payment overdue</p>
          </div>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi ${inv.client.name},</p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">
            This is a reminder that invoice <strong>${inv.invoice_number}</strong>
            ${inv.due_date ? ` (due ${formatDate(inv.due_date)})` : ''} for
            <strong>${formatMoney(inv.total, inv.currency)}</strong> is now overdue.
          </p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 8px;">Please arrange payment at your earliest convenience.</p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">
            If you have already made payment, please disregard this message.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#18181b;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#71717a;">Sent via EloNi</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
      })
      sent++
    } catch (err) {
      console.error(`Failed to send reminder for invoice ${inv.invoice_number}:`, err)
    }
  }

  return NextResponse.json({ ok: true, sent, total: toRemind.length })
}
