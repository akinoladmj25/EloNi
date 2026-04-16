'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatMoney, getCurrencySymbol } from '@/lib/utils'
import { Plus, Trash2, ChevronLeft } from 'lucide-react'
import type { Client, Quote, QuoteItem, Organisation } from '@/types'

const CURRENCIES = [
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'NGN', label: 'NGN — Nigerian Naira' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { code: 'KES', label: 'KES — Kenyan Shilling' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
]

interface LineItem { id: string; description: string; quantity: number; unit_price: number; amount: number }

interface EditQuoteFormProps {
  quote: Quote & { items: QuoteItem[] }
  org: Organisation
  clients: Client[]
}

export default function EditQuoteForm({ quote, org, clients }: EditQuoteFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    client_id: quote.client_id ?? '',
    quote_number: quote.quote_number,
    issue_date: quote.issue_date,
    expiry_date: quote.expiry_date ?? '',
    currency: quote.currency,
    discount: quote.discount,
    tax_rate: quote.tax_rate,
    notes: quote.notes ?? '',
    terms: quote.terms ?? '',
  })

  const [items, setItems] = useState<LineItem[]>(
    quote.items.length > 0
      ? quote.items.sort((a, b) => a.sort_order - b.sort_order)
          .map(i => ({ id: i.id, description: i.description, quantity: i.quantity, unit_price: i.unit_price, amount: i.amount }))
      : [{ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, amount: 0 }]
  )

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.amount = Number(updated.quantity) * Number(updated.unit_price)
      }
      return updated
    }))
  }, [])

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0)
  const taxableAmount = subtotal - form.discount
  const taxAmount = taxableAmount * (form.tax_rate / 100)
  const total = taxableAmount + taxAmount

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    const supabase = createClient()

    const { error: quoteError } = await supabase
      .from('quotes')
      .update({
        client_id: form.client_id || null,
        quote_number: form.quote_number,
        currency: form.currency,
        issue_date: form.issue_date,
        expiry_date: form.expiry_date || null,
        subtotal,
        discount: form.discount,
        tax_rate: form.tax_rate,
        tax_amount: taxAmount,
        total,
        notes: form.notes || null,
        terms: form.terms || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quote.id)

    if (quoteError) { setError(quoteError.message); setSaving(false); return }

    await supabase.from('quote_items').delete().eq('quote_id', quote.id)

    const lineItems = items
      .filter(i => i.description.trim())
      .map((i, idx) => ({
        quote_id: quote.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        amount: i.amount,
        sort_order: idx,
      }))

    if (lineItems.length > 0) await supabase.from('quote_items').insert(lineItems)

    router.push(`/quotes/${quote.id}`)
  }

  const inp = 'w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors'
  const lbl = 'block text-xs font-medium text-zinc-500 mb-1.5'

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-5">
        <Link href={`/quotes/${quote.id}`} className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          <ChevronLeft size={14} /> Back to quote
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-md">{error}</p>}

      <div className="space-y-3">
        <div className="bg-white rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>Client</label>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className={inp}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Quote Number</label>
              <input type="text" value={form.quote_number}
                onChange={e => setForm(f => ({ ...f, quote_number: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Issue Date</label>
              <input type="date" value={form.issue_date}
                onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Expiry Date</label>
              <input type="date" value={form.expiry_date}
                onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Currency</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={inp}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Line items</h2>
          <div className="space-y-2.5">
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-1">
              <div className="col-span-5 text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Description</div>
              <div className="col-span-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Qty</div>
              <div className="col-span-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Unit price</div>
              <div className="col-span-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Amount</div>
              <div className="col-span-1"></div>
            </div>
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-12 sm:col-span-5">
                  <input type="text" placeholder="Description" value={item.description}
                    onChange={e => updateItem(item.id, 'description', e.target.value)} className={inp} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input type="number" min="0" step="0.01" value={item.quantity}
                    onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className={inp} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">{getCurrencySymbol(form.currency)}</span>
                    <input type="number" min="0" step="0.01" value={item.unit_price}
                      onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      className={`${inp} pl-7`} />
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <div className="h-9 px-3 flex items-center rounded-md bg-zinc-50 border border-zinc-200 text-sm text-zinc-700">
                    {formatMoney(item.amount, form.currency)}
                  </div>
                </div>
                <div className="col-span-1">
                  <button type="button" onClick={() => setItems(p => p.filter(i => i.id !== item.id))}
                    disabled={items.length === 1}
                    className="p-1.5 text-zinc-300 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button"
            onClick={() => setItems(p => [...p, { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, amount: 0 }])}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
            <Plus size={15} /> Add line item
          </button>
          <div className="mt-5 pt-4 border-t border-zinc-100 flex justify-end">
            <div className="w-full sm:w-56 space-y-2.5">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Subtotal</span><span className="text-zinc-900">{formatMoney(subtotal, form.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-500 gap-3">
                <span className="shrink-0">Discount</span>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">{getCurrencySymbol(form.currency)}</span>
                  <input type="number" min="0" step="0.01" value={form.discount}
                    onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-6 pr-2.5 py-1.5 text-sm text-right border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-400" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-500 gap-3">
                <span className="shrink-0">{org.tax_name} %</span>
                <input type="number" min="0" max="100" step="0.01" value={form.tax_rate}
                  onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))}
                  className="w-28 px-2.5 py-1.5 text-sm text-right border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-400" />
              </div>
              {form.tax_rate > 0 && (
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>{org.tax_name} ({form.tax_rate}%)</span><span>{formatMoney(taxAmount, form.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-zinc-900 pt-2.5 border-t border-zinc-200">
                <span>Total</span><span>{formatMoney(total, form.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Notes &amp; terms</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3} placeholder="Any additional notes..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors resize-none" />
            </div>
            <div>
              <label className={lbl}>Terms</label>
              <textarea value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                rows={3} placeholder="e.g. Quote valid for 30 days."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors resize-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Link href={`/quotes/${quote.id}`}
            className="inline-flex items-center h-9 px-4 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </Link>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-sm font-medium text-white disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
