import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Invoice, Client } from '@/types'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to   = url.searchParams.get('to')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!org) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  let query = supabase
    .from('invoices')
    .select('*, client:clients(name,company,email)')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  if (from) query = query.gte('issue_date', from)
  if (to)   query = query.lte('issue_date', to)

  const { data } = await query as unknown as {
    data: (Invoice & { client: Pick<Client, 'name' | 'company' | 'email'> | null })[] | null
  }

  const rows = data ?? []

  const headers = ['Invoice Number', 'Status', 'Client', 'Company', 'Client Email', 'Issue Date', 'Due Date', 'Currency', 'Subtotal', 'Discount', 'Tax Rate', 'Tax Amount', 'Total', 'Sent At', 'Paid At']

  const escape = (val: string | number | null | undefined) => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const lines = [
    headers.join(','),
    ...rows.map(inv => [
      inv.invoice_number,
      inv.status,
      inv.client?.name ?? '',
      inv.client?.company ?? '',
      inv.client?.email ?? '',
      inv.issue_date,
      inv.due_date ?? '',
      inv.currency,
      inv.subtotal,
      inv.discount,
      inv.tax_rate,
      inv.tax_amount,
      inv.total,
      inv.sent_at ?? '',
      inv.paid_at ?? '',
    ].map(escape).join(',')),
  ]

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
