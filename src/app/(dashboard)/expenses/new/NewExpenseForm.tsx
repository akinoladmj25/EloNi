'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Scan, Loader2, CheckCircle2 } from 'lucide-react'

const CATEGORIES = ['Software', 'Travel', 'Office', 'Marketing', 'Equipment', 'Meals', 'Professional', 'Other'] as const
const CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN', 'CAD', 'AUD', 'GHS', 'KES', 'ZAR', 'CHF', 'JPY']

interface Props { orgId: string; defaultCurrency: string }

export default function NewExpenseForm({ orgId, defaultCurrency }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    description: '',
    category: 'Other' as typeof CATEGORIES[number],
    amount: '',
    vat_amount: '',
    currency: defaultCurrency,
    date: today,
    notes: '',
  })

  const set = (field: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setError('')
    const data = new FormData()
    data.append('receipt', file)
    try {
      const res = await fetch('/api/ai/scan-receipt', { method: 'POST', body: data })
      const result = await res.json()
      if (!res.ok) { setError(result.error ?? 'Scan failed'); return }
      if (result.description) set('description', result.description)
      if (result.category && CATEGORIES.includes(result.category)) set('category', result.category)
      if (result.amount && result.amount > 0) set('amount', String(result.amount))
      if (result.date) set('date', result.date)
      setReceiptFile(file)
    } catch {
      setError('Receipt scan failed. Please fill in manually.')
    } finally {
      setScanning(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) { setError('Description is required'); return }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setError('Valid amount is required'); return }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { data: expenseData, error: dbError } = await supabase.from('expenses').insert({
      org_id: orgId,
      description: form.description,
      category: form.category,
      amount: parseFloat(form.amount),
      vat_amount: form.vat_amount ? parseFloat(form.vat_amount) : 0,
      currency: form.currency,
      date: form.date,
      notes: form.notes || null,
      receipt_url: null,
    }).select('id').single()

    if (dbError) { setError(dbError.message); setSaving(false); return }

    // Upload receipt if one was scanned
    if (receiptFile && expenseData?.id) {
      try {
        const ext = receiptFile.name.split('.').pop() ?? 'jpg'
        const path = `${orgId}/${expenseData.id}/receipt.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(path, receiptFile)

        if (!uploadError) {
          await supabase.from('expenses').update({ receipt_url: path }).eq('id', expenseData.id)
        }
      } catch {
        // Storage upload failed — expense is still saved, just without receipt
      }
    }

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

      {/* Receipt scan */}
      <div className="mb-4 flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScanReceipt} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium disabled:opacity-50 transition-colors shrink-0"
        >
          {scanning ? <Loader2 size={13} className="animate-spin" /> : <Scan size={13} />}
          {scanning ? 'Scanning…' : 'Scan receipt'}
        </button>
        {receiptFile ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="font-medium">Receipt attached</span>
            <span className="text-zinc-400 truncate max-w-[160px]">— {receiptFile.name}</span>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">Upload a photo of your receipt and AI will fill in the details automatically.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="bg-white rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Expense Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className={lbl}>Description <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="e.g. Adobe Creative Cloud subscription"
                value={form.description} onChange={e => set('description', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value as typeof CATEGORIES[number])} className={inp}>
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
              <label className={lbl}>VAT included <span className="text-zinc-300 font-normal">(reclaimable input VAT)</span></label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.vat_amount} onChange={e => set('vat_amount', e.target.value)} className={inp} />
                <button type="button"
                  onClick={() => {
                    const a = parseFloat(form.amount)
                    if (!isNaN(a) && a > 0) set('vat_amount', (a / 6).toFixed(2))
                  }}
                  className="h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs text-zinc-600 whitespace-nowrap shrink-0">
                  Auto 20%
                </button>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Leave 0 if no VAT was charged. Used for VAT returns.</p>
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
            {saving ? 'Saving…' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  )
}
