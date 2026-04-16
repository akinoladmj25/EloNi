import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Quote, Client } from '@/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!org) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { data } = await supabase
    .from('quotes')
    .select('*, client:clients(name,company,email)')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false }) as {
      data: (Quote & { client: Pick<Client, 'name' | 'company' | 'email'> | null })[] | null
    }

  const rows = data ?? []

  const headers = ['Quote Number', 'Status', 'Client', 'Company', 'Client Email', 'Issue Date', 'Expiry Date', 'Currency', 'Subtotal', 'Discount', 'Tax Rate', 'Tax Amount', 'Total', 'Sent At', 'Accepted At', 'Converted Invoice ID']

  const escape = (val: string | number | null | undefined) => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const lines = [
    headers.join(','),
    ...rows.map(q => [
      q.quote_number,
      q.status,
      q.client?.name ?? '',
      q.client?.company ?? '',
      q.client?.email ?? '',
      q.issue_date,
      q.expiry_date ?? '',
      q.currency,
      q.subtotal,
      q.discount,
      q.tax_rate,
      q.tax_amount,
      q.total,
      q.sent_at ?? '',
      q.accepted_at ?? '',
      q.converted_invoice_id ?? '',
    ].map(escape).join(',')),
  ]

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="quotes-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
