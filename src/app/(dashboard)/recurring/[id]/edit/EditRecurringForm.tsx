'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import type { RecurringInvoice, RecurringInvoiceItem } from '@/types'

const CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN', 'CAD', 'AUD', 'GHS', 'KES', 'ZAR', 'CHF', 'JPY']
const FREQUENCIES = [
  { value: 'weekly',    label: 'Weekly' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually',  label: 'Annually' },
]

interface LineItem { id?: string; description: string; quantity: string; unit_price: string; amount: number }

interface Props {
  rec: RecurringInvoice & { items: RecurringInvoiceItem[] }
  orgId: string
  taxName: string
  clients: { id: string; name: string; company: string | null }[]
}

export default function EditRecurringForm({ rec, orgId, taxName, clients }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: rec.title,
    client_id: rec.client_id ?? '',
    currency: rec.currency,
    frequency: rec.frequency,
    next_date: rec.next_date,
    tax_rate: String(rec.tax_rate),
    discount: String(rec.discount),
    notes: rec.notes ?? '',
    terms: rec.terms ?? '',
    active: rec.active,
  })

  const [items, setItems] = useState<LineItem[]>(
    (rec.items ?? []).sort((a, b) => a.sort_order - b.sort_order).map(it => ({
      id: it.id,
      description: it.description,
      quantity: String(it.quantity),
      unit_price: String(it.unit_price),
      amount: it.amount,
    }))
  )

  const set = (field: keyof typeof form, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }))

  const updateItem = (i: number, field: keyof LineItem, value: string) => {
    setItems(prev => {
      const next = [...prev]
      const item = { ...next[i], [field]: value }
      const qty = parseFloat(field === 'quantity' ? value : item.quantity) || 0
      const price = parseFloat(field === 'unit_price' ? value : item.unit_price) || 0
      item.amount = qty * price
      next[i] = item
      return next
    })
  }

  const subtotal = items.reduce((s, it) => s + it.amount, 0)
  const discount = parseFloat(form.discount) || 0
  const taxRate = parseFloat(form.tax_rate) || 0
  const taxAmount = (subtotal - discount) * (taxRate / 100)
  const total = subtotal - discount + taxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')

    const supabase = createClient()

    const { error: dbError } = await supabase
      .from('recurring_invoices')
      .update({
        client_id: form.client_id || null,
        title: form.title,
        currency: form.currency,
        frequency: form.frequency,
        next_date: form.next_date,
        subtotal,
        discount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: form.notes || null,
        terms: form.terms || null,
        active: form.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rec.id)

    if (dbError) { setError(dbError.message); setSaving(false); return }

    // Replace all items
    await supabase.from('recurring_invoice_items').delete().eq('recurring_invoice_id', rec.id)
    if (items.length > 0) {
      await supabase.from('recurring_invoice_items').insert(
        items.map((it, idx) => ({
          recurring_invoice_id: rec.id,
          description: it.description,
          quantity: parseFloat(it.quantity) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
          amount: it.amount,
          sort_order: idx,
        }))
      )
    }

    router.push('/recurring')
  }

  const handleDelete = async () => {
    if (!confirm('Delete this recurring template? This cannot be undone.')) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('recurring_invoices').delete().eq('id', rec.id)
    router.push('/recurring')
  }

  const inp = 'w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors'
  const lbl = 'block text-xs font-medium text-zinc-500 mb-1.5'

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <Link href="/recurring" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          <ChevronLeft size={14} />
          Recurring
        </Link>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-md">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="bg-white rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Template Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className={lbl}>Template Title <span className="text-red-500">*</span></label>
              <input type="text" required value={form.title} onChange={e => set('title', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Client</label>
              <select value={form.client_id} onChange={e => set('client_id', e.target.value)} className={inp}>
                <option value="">No client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inp}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Frequency</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className={inp}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Next Invoice Date</label>
              <input type="date" value={form.next_date} onChange={e => set('next_date', e.target.value)} className={inp} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Line Items</h2>
          </div>
          <div className="p-5 space-y-3">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-12 sm:col-span-5">
                  <input type="text" placeholder="Description"
                    value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                    className={inp} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input type="number" placeholder="Qty" min="0" step="any"
                    value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)}
                    className={inp} />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <input type="number" placeholder="Unit price" min="0" step="0.01"
                    value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)}
                    className={inp} />
                </div>
                <div className="col-span-3 sm:col-span-1 text-right text-sm text-zinc-500 tabular-nums">
                  {item.amount.toFixed(2)}
                </div>
                <div className="col-span-1">
                  <button type="button" onClick={() => setItems(p => p.filter((_, j) => j !== i))}
                    className="text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button type="button"
              onClick={() => setItems(p => [...p, { description: '', quantity: '1', unit_price: '', amount: 0 }])}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
              <Plus size={14} />
              Add line item
            </button>
          </div>

          <div className="border-t border-zinc-100 px-5 py-4">
            <div className="flex justify-end">
              <div className="w-full sm:w-56 space-y-2.5">
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Subtotal</span><span>{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-500 gap-3">
                  <span>Discount</span>
                  <input type="number" min="0" step="0.01"
                    value={form.discount} onChange={e => set('discount', e.target.value)}
                    className="w-24 h-7 px-2 rounded border border-zinc-200 text-sm text-right focus:outline-none focus:border-zinc-400" />
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-500 gap-3">
                  <span>{taxName} %</span>
                  <input type="number" min="0" max="100" step="0.01"
                    value={form.tax_rate} onChange={e => set('tax_rate', e.target.value)}
                    className="w-24 h-7 px-2 rounded border border-zinc-200 text-sm text-right focus:outline-none focus:border-zinc-400" />
                </div>
                <div className="flex justify-between text-base font-bold text-zinc-900 pt-2.5 border-t border-zinc-200">
                  <span>Total</span><span>{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>Notes</label>
              <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors resize-none" />
            </div>
            <div>
              <label className={lbl}>Payment Terms</label>
              <textarea rows={3} value={form.terms} onChange={e => set('terms', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors resize-none" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300" />
            <label htmlFor="active" className="text-sm text-zinc-600">Active (template is enabled)</label>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-red-200 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
            {deleting ? 'Deleting…' : 'Delete Template'}
          </button>
          <div className="flex gap-2">
            <Link href="/recurring"
              className="inline-flex items-center h-9 px-4 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancel
            </Link>
            <button type="submit" disabled={saving}
              className="h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-sm font-medium text-white disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
