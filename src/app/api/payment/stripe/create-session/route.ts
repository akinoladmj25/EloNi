import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/utils'

// Currencies Stripe does NOT support as decimal (zero-decimal currencies)
const ZERO_DECIMAL = ['JPY', 'KRW', 'VND', 'BIF', 'CLP', 'GNF', 'MGA', 'PYG', 'RWF', 'UGX', 'XAF', 'XOF']

export async function POST(req: Request) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, currency, status, client:clients(name, email), org:organisations(*)')
    .eq('public_token', token)
    .single() as { data: any }

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'paid') return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })

  const secretKey = invoice.org?.stripe_secret_key
  if (!secretKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

  const stripe = new Stripe(secretKey)

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // Convert amount to smallest unit
  const isZeroDecimal = ZERO_DECIMAL.includes(invoice.currency.toUpperCase())
  const unitAmount = isZeroDecimal ? Math.round(invoice.total) : Math.round(invoice.total * 100)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: invoice.currency.toLowerCase(),
        product_data: {
          name: `Invoice ${invoice.invoice_number}`,
          description: `Payment to ${invoice.org?.name ?? 'your vendor'}`,
        },
        unit_amount: unitAmount,
      },
      quantity: 1,
    }],
    customer_email: invoice.client?.email ?? undefined,
    metadata: { invoice_id: invoice.id, public_token: token },
    success_url: `${origin}/p/invoice/${token}?paid=stripe`,
    cancel_url: `${origin}/p/invoice/${token}`,
  })

  // Mark invoice as paid immediately (Stripe will also send webhook)
  // For now we optimistically mark on redirect back — handled in the portal page
  return NextResponse.json({ url: session.url })
}
