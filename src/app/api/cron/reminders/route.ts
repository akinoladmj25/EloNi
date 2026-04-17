import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { formatMoney, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86400000)
}

function reminderTier(days: number): { tier: number; subject: string; urgency: string; color: string } | null {
  if (days === 3)  return { tier: 1, subject: 'Friendly reminder',  urgency: 'This is a friendly reminder that your invoice is now 3 days overdue.', color: '#f59e0b' }
  if (days === 7)  return { tier: 2, subject: 'Second notice',      urgency: 'This is a second notice. Your invoice is now 7 days overdue and requires your prompt attention.', color: '#f97316' }
  if (days === 14) return { tier: 3, subject: 'Final notice',       urgency: 'This is a final notice. Your invoice is 14 days overdue. Please arrange payment immediately to avoid further action.', color: '#dc2626' }
  return null
}

export async function GET(req: Request) {
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

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, currency, due_date, client:clients(name, email), org:organisations(name, email)')
    .eq('status', 'overdue')
    .not('client', 'is', null)

  if (error) {
    console.error('Cron reminder error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  let sent = 0
  const skipped: string[] = []

  for (const inv of (invoices ?? []) as any[]) {
    if (!inv.client?.email || !inv.due_date) { skipped.push(inv.invoice_number); continue }

    const days = daysOverdue(inv.due_date)
    const tier = reminderTier(days)
    if (!tier) continue // not on a reminder milestone day

    try {
      await resend.emails.send({
        from: FROM,
        to: [inv.client.email],
        replyTo: inv.org?.email ?? undefined,
        subject: `${tier.subject}: Invoice ${inv.invoice_number} from ${inv.org?.name ?? 'your supplier'}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
      <tr><td style="background:#18181b;padding:24px 32px;">
        <div style="font-size:19px;font-weight:700;color:white;">${inv.org?.name ?? 'Your supplier'}</div>
        ${tier.tier > 1 ? `<div style="font-size:11px;color:#71717a;margin-top:4px;">Notice ${tier.tier} of 3</div>` : ''}
      </td></tr>
      <tr><td style="background:white;padding:32px;">
        <div style="background:${tier.color}15;border:1px solid ${tier.color}40;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:${tier.color};">Payment overdue — ${days} days</p>
        </div>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi ${inv.client.name},</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">${tier.urgency}</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">
          Invoice <strong>${inv.invoice_number}</strong>${inv.due_date ? ` (due ${formatDate(inv.due_date)})` : ''} for
          <strong>${formatMoney(inv.total, inv.currency)}</strong> remains unpaid.
        </p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">
          If you have already made payment, please disregard this message and accept our thanks.
        </p>
      </td></tr>
      <tr><td style="background:#18181b;padding:16px 32px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#71717a;">Sent via EloNi</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
      })
      sent++
    } catch (err) {
      console.error(`Failed to send reminder for ${inv.invoice_number}:`, err)
    }
  }

  return NextResponse.json({ ok: true, sent, skipped: skipped.length })
}
