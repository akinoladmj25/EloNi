'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft } from 'lucide-react'
import type { Expense, ExpenseCategory } from '@/types'

const CATEGORIES = ['Software', 'Travel', 'Office', 'Marketing', 'Equipment', 'Meals', 'Professional', 'Other'] as const
const CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN', 'CAD', 'AUD', 'GHS', 'KES', 'ZAR', 'CHF', 'JPY']

export default function EditExpenseForm({ expense }: { expense: Expense }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    description: expense.description,
    category: expense.category as ExpenseCategory,
    amount: String(expense.amount),
    currency: expense.currency,
    date: expense.date,
    notes: expense.notes ?? '',
  })

  const set = (field: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) { setError('Description is required'); return }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setError('Valid amount is required'); return }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: dbError } = await supabase.from('expenses').update({
      description: form.description,
      category: form.category,
      amount: parseFloat(form.amount),
      currency: form.currency,
      date: form.date,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', expense.id)

    if (dbError) { setError(dbError.message); setSaving(false); return }
    router.push('/expenses')
  }

  const inp = 'w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors'
  const lbl = 'block text-xs font-medium text-zinc-500 mb-1.5'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <Link href="/expenses" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          <ChevronLeft size={14} />
          Expenses
        </Link>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-md">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="bg-white rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Expense Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className={lbl}>Description <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="e.g. Adobe Creative Cloud"
                value={form.description} onChange={e => set('description', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value as ExpenseCategory)} className={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Amount <span className="text-red-500">*</span></label>
              <input type="number" required min="0" step="0.01" placeholder="0.00"
                value={form.amount} onChange={e => set('amount', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inp}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Notes</label>
              <textarea rows={3} placeholder="Optional notes..."
                value={form.notes} onChange={e => set('notes', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors resize-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Link href="/expenses"
            className="inline-flex items-center h-9 px-4 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-sm font-medium text-white disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
