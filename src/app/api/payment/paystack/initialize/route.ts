import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Paystack charges in kobo (NGN), pesewas (GHS), cents (ZAR, USD, etc.)
// All supported currencies use subunit × 100 except none (Paystack handles NGN, GHS, ZAR, USD, EUR, GBP, KES)
export async function POST(req: Request) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, currency, status, client:clients(email), org:organisations(paystack_secret_key, name)')
    .eq('public_token', token)
    .single() as { data: any }

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  const secretKey = invoice.org?.paystack_secret_key
  if (!secretKey) return NextResponse.json({ error: 'Paystack not configured' }, { status: 503 })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const amountKobo = Math.round(invoice.total * 100)

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      email: invoice.client?.email ?? 'customer@example.com',
      amount: amountKobo,
      currency: invoice.currency.toUpperCase(),
      reference: `inv_${invoice.id}_${Date.now()}`,
      callback_url: `${origin}/p/invoice/${token}?paid=paystack`,
      metadata: {
        invoice_id: invoice.id,
        public_token: token,
        invoice_number: invoice.invoice_number,
        custom_fields: [{
          display_name: 'Invoice',
          variable_name: 'invoice_number',
          value: invoice.invoice_number,
        }],
      },
    }),
  }).then(r => r.json())

  if (!res.status) return NextResponse.json({ error: res.message ?? 'Paystack error' }, { status: 502 })

  return NextResponse.json({ url: res.data.authorization_url, reference: res.data.reference })
}
