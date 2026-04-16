'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 mb-1">Set new password</h1>
      <p className="text-sm text-zinc-500 mb-8">Choose a new password for your account.</p>

      {error && (
        <p className="mb-5 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-md">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">New Password</label>
          <input
            type="password" required autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">Confirm Password</label>
          <input
            type="password" required autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
          />
        </div>
        <button type="submit" disabled={saving}
          className="w-full h-10 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
