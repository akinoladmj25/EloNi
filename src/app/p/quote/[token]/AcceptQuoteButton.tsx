'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AcceptQuoteButton({ quoteId, token }: { quoteId: string; token: string }) {
  const [status, setStatus] = useState<'idle' | 'accepting' | 'declining' | 'done-accept' | 'done-decline' | 'error'>('idle')

  async function handleAccept() {
    setStatus('accepting')
    const supabase = createClient()
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'accepted' })
      .eq('id', quoteId)
      .eq('public_token', token)
    if (error) { setStatus('error'); return }
    setStatus('done-accept')
    window.location.reload()
  }

  async function handleDecline() {
    if (!confirm('Are you sure you want to decline this quote?')) return
    setStatus('declining')
    const supabase = createClient()
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'declined' })
      .eq('id', quoteId)
      .eq('public_token', token)
    if (error) { setStatus('error'); return }
    setStatus('done-decline')
    window.location.reload()
  }

  if (status === 'error') {
    return <span style={{ fontSize: '13px', color: '#dc2626' }}>Something went wrong. Please try again.</span>
  }

  return (
    <>
      <button
        onClick={handleAccept}
        disabled={status === 'accepting'}
        className="btn btn-accept"
      >
        {status === 'accepting' ? 'Accepting…' : 'Accept quote'}
      </button>
      <button
        onClick={handleDecline}
        disabled={status === 'declining'}
        className="btn btn-decline"
      >
        {status === 'declining' ? 'Declining…' : 'Decline'}
      </button>
    </>
  )
}
