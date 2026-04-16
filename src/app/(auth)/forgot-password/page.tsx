'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setSending(false)
      return
    }

    setSent(true)
    setSending(false)
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 mb-1">Check your email</h1>
        <p className="text-sm text-zinc-500 mb-6">
          We sent a password reset link to <span className="font-medium text-zinc-700">{email}</span>.
          Check your inbox and click the link to reset your password.
        </p>
        <Link href="/login" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
          <ChevronLeft size={14} />
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/login" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          <ChevronLeft size={14} />
          Back to sign in
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-zinc-900 mb-1">Reset password</h1>
      <p className="text-sm text-zinc-500 mb-8">Enter your email and we'll send you a reset link.</p>

      {error && (
        <p className="mb-5 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-md">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
          <input
            type="email" required autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
          />
        </div>
        <button type="submit" disabled={sending}
          className="w-full h-10 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors disabled:opacity-50">
          {sending ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </div>
  )
}
