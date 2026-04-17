import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getPayPalToken(clientId: string, clientSecret: string): Promise<string> {
  const base = process.env.PAYPAL_BASE_URL ?? 'https://api-m.paypal.com'
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('PayPal auth failed')
  return data.access_token
}

export async function POST(req: Request) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, currency, status, org:organisations(paypal_client_id, paypal_client_secret, name)')
    .eq('public_token', token)
    .single() as { data: any }

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  const clientId = invoice.org?.paypal_client_id
  const clientSecret = invoice.org?.paypal_client_secret
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'PayPal not configured' }, { status: 503 })

  const accessToken = await getPayPalToken(clientId, clientSecret)
  const base = process.env.PAYPAL_BASE_URL ?? 'https://api-m.paypal.com'
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const order = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: invoice.id,
        description: `Invoice ${invoice.invoice_number}`,
        amount: {
          currency_code: invoice.currency.toUpperCase(),
          value: invoice.total.toFixed(2),
        },
      }],
      application_context: {
        return_url: `${origin}/p/invoice/${token}?paid=paypal`,
        cancel_url: `${origin}/p/invoice/${token}`,
        brand_name: invoice.org?.name ?? 'Invoice Payment',
        user_action: 'PAY_NOW',
      },
    }),
  }).then(r => r.json())

  const approveLink = order.links?.find((l: any) => l.rel === 'approve')?.href
  if (!approveLink) return NextResponse.json({ error: 'PayPal order failed' }, { status: 502 })

  return NextResponse.json({ url: approveLink, orderId: order.id })
}
