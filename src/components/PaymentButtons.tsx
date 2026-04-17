'use client'

import { useState } from 'react'

interface PaymentButtonsProps {
  token: string
  hasStripe: boolean
  hasPayPal: boolean
  hasPaystack: boolean
  invoiceTotal: string  // formatted amount string for display
}

export default function PaymentButtons({ token, hasStripe, hasPayPal, hasPaystack, invoiceTotal }: PaymentButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!hasStripe && !hasPayPal && !hasPaystack) return null

  const handleStripe = async () => {
    setLoading('stripe')
    setError('')
    try {
      const res = await fetch('/api/payment/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error ?? 'Stripe error')
    } catch {
      setError('Payment failed. Please try again.')
    }
    setLoading(null)
  }

  const handlePayPal = async () => {
    setLoading('paypal')
    setError('')
    try {
      const res = await fetch('/api/payment/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error ?? 'PayPal error')
    } catch {
      setError('Payment failed. Please try again.')
    }
    setLoading(null)
  }

  const handlePaystack = async () => {
    setLoading('paystack')
    setError('')
    try {
      const res = await fetch('/api/payment/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error ?? 'Paystack error')
    } catch {
      setError('Payment failed. Please try again.')
    }
    setLoading(null)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '20px 24px',
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
          Pay this invoice online
        </p>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
          Amount due: <strong>{invoiceTotal}</strong> — Choose a payment method below
        </p>

        {error && (
          <p style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {hasStripe && (
            <button
              onClick={handleStripe}
              disabled={!!loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: loading === 'stripe' ? '#e5e7eb' : '#635bff',
                color: 'white', border: 'none', borderRadius: 7,
                padding: '10px 18px', fontSize: 13, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {loading === 'stripe' ? 'Redirecting…' : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.91 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                  Pay with Card
                </>
              )}
            </button>
          )}

          {hasPayPal && (
            <button
              onClick={handlePayPal}
              disabled={!!loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: loading === 'paypal' ? '#e5e7eb' : '#ffc439',
                color: '#003087', border: 'none', borderRadius: 7,
                padding: '10px 18px', fontSize: 13, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {loading === 'paypal' ? 'Redirecting…' : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#003087">
                    <path d="M7.016 19.198h-4.2a.562.562 0 0 1-.555-.65L5.093 2.76A.704.704 0 0 1 5.788 2h7.124c3.271 0 5.04 1.611 4.718 4.318-.336 2.85-2.528 4.525-5.621 4.525H9.36a.704.704 0 0 0-.694.598l-.65 7.757z"/>
                    <path d="M19.098 7.23c.208 3.415-2.503 5.484-6.394 5.484h-1.467a.704.704 0 0 0-.694.598l-.913 5.784a.562.562 0 0 1-.555.48H5.914a.562.562 0 0 1-.555-.648l.396-2.51a.704.704 0 0 1 .694-.597h2.204c3.093 0 5.285-1.675 5.621-4.525.264-2.242-.947-3.78-2.985-4.15C12.602 7 14.25 7 16.105 7c1.57 0 2.802.356 2.993.23z" opacity=".4"/>
                  </svg>
                  Pay with PayPal
                </>
              )}
            </button>
          )}

          {hasPaystack && (
            <button
              onClick={handlePaystack}
              disabled={!!loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: loading === 'paystack' ? '#e5e7eb' : '#00c3f7',
                color: 'white', border: 'none', borderRadius: 7,
                padding: '10px 18px', fontSize: 13, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {loading === 'paystack' ? 'Redirecting…' : 'Pay with Paystack'}
            </button>
          )}
        </div>

        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
          Payments are processed securely. You&apos;ll be redirected to complete payment.
        </p>
      </div>
    </div>
  )
}
