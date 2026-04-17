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
  const { orderId, token } = await req.json()
  if (!orderId || !token) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, org:organisations(paypal_client_id, paypal_client_secret)')
    .eq('public_token', token)
    .single() as { data: any }

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const clientId = invoice.org?.paypal_client_id
  const clientSecret = invoice.org?.paypal_client_secret
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'PayPal not configured' }, { status: 503 })

  const accessToken = await getPayPalToken(clientId, clientSecret)
  const base = process.env.PAYPAL_BASE_URL ?? 'https://api-m.paypal.com'

  const capture = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  }).then(r => r.json())

  if (capture.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'Capture failed', details: capture }, { status: 502 })
  }

  await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'paypal',
      payment_reference: orderId,
    })
    .eq('id', invoice.id)
    .neq('status', 'paid')

  return NextResponse.json({ success: true })
}
