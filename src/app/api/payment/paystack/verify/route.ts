import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { reference, token } = await req.json()
  if (!reference || !token) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, org:organisations(paystack_secret_key)')
    .eq('public_token', token)
    .single() as { data: any }

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const secretKey = invoice.org?.paystack_secret_key
  if (!secretKey) return NextResponse.json({ error: 'Paystack not configured' }, { status: 503 })

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  }).then(r => r.json())

  if (!res.status || res.data?.status !== 'success') {
    return NextResponse.json({ error: 'Payment not verified', details: res }, { status: 402 })
  }

  await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'paystack',
      payment_reference: reference,
    })
    .eq('id', invoice.id)
    .neq('status', 'paid')

  return NextResponse.json({ success: true })
}
