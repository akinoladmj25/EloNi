'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import type { Account } from '@/lib/accounting'

const TYPE_LABEL: Record<string, string> = {
  asset:     'Assets',
  liability: 'Liabilities',
  equity:    'Equity',
  income:    'Income',
  expense:   'Expenses',
}
const TYPE_ORDER: Record<string, number> = { asset: 1, liability: 2, equity: 3, income: 4, expense: 5 }

interface Props { accounts: Account[]; currency: string }

export default function ChartOfAccountsClient({ accounts: initial, currency }: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState(initial)
  const [dirty, setDirty] = useState<Record<string, { opening_balance?: number; is_active?: boolean }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [pending, startTransition] = useTransition()

  const visible = accounts.filter(a => showInactive || a.is_active)
  const grouped = visible.reduce<Record<string, Account[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {})
  const sortedTypes = Object.keys(grouped).sort((a, b) => (TYPE_ORDER[a] ?? 99) - (TYPE_ORDER[b] ?? 99))

  const updateLocal = (id: string, patch: Partial<Account>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    setDirty(d => ({ ...d, [id]: { ...d[id], ...patch } }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    const supabase = createClient()
    const updates = Object.entries(dirty)
    let failed = 0
    for (const [id, patch] of updates) {
      const { error: e } = await supabase.from('chart_of_accounts').update(patch).eq('id', id)
      if (e) failed++
    }
    setSaving(false)
    if (failed > 0) {
      setError(`${failed} update${failed > 1 ? 's' : ''} failed`)
      return
    }
    setDirty({})
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    startTransition(() => router.refresh())
  }

  const totalOpeningAssets      = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + (a.opening_balance ?? 0), 0)
  const totalOpeningLiabilities = accounts.filter(a => a.type === 'liability').reduce((s, a) => s + (a.opening_balance ?? 0), 0)
  const totalOpeningEquity      = accounts.filter(a => a.type === 'equity').reduce((s, a) => s + (a.opening_balance ?? 0), 0)
  const balance = totalOpeningAssets - totalOpeningLiabilities - totalOpeningEquity
  const balanced = Math.abs(balance) < 0.01

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 px-3 py-2.5 rounded-md">
          <AlertCircle size={13} /> {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 px-3 py-2.5 rounded-md">
          <CheckCircle2 size={13} /> Saved
        </div>
      )}

      {/* Opening balance check */}
      <div className={`rounded-lg border px-4 py-3 ${balanced ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-sm font-semibold ${balanced ? 'text-emerald-800' : 'text-amber-800'}`}>
              {balanced ? 'Opening balances are in balance' : 'Opening balances are out of balance'}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Assets ({formatMoney(totalOpeningAssets, currency)}) =
              Liabilities ({formatMoney(totalOpeningLiabilities, currency)}) +
              Equity ({formatMoney(totalOpeningEquity, currency)})
              {!balanced && <> · Difference: <strong>{formatMoney(balance, currency)}</strong></>}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => setShowInactive(s => !s)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium transition-colors"
        >
          {showInactive ? <EyeOff size={13} /> : <Eye size={13} />}
          {showInactive ? 'Hide inactive' : 'Show inactive'}
        </button>
        <button
          onClick={save}
          disabled={saving || pending || Object.keys(dirty).length === 0}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving…' : `Save ${Object.keys(dirty).length || ''} changes`}
        </button>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50/70 border-b border-zinc-100">
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3 w-20">Code</th>
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Name</th>
              <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3 w-44">Opening Balance</th>
              <th className="text-center text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3 w-24">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sortedTypes.map(t => (
              <>
                <tr key={`group-${t}`} className="bg-zinc-50/30">
                  <td colSpan={4} className="px-5 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{TYPE_LABEL[t]}</td>
                </tr>
                {grouped[t].map(a => (
                  <tr key={a.id} className={!a.is_active ? 'opacity-40' : ''}>
                    <td className="px-5 py-2.5 text-xs font-mono text-zinc-500">{a.code}</td>
                    <td className="px-5 py-2.5 text-sm text-zinc-700">
                      {a.name}
                      {a.is_system && <span className="ml-2 text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">System</span>}
                    </td>
                    <td className="px-5 py-2.5">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={a.opening_balance ?? 0}
                        onChange={e => updateLocal(a.id, { opening_balance: parseFloat(e.target.value) || 0 })}
                        className="w-full h-8 px-2.5 text-sm text-right border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      />
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={a.is_active}
                        disabled={a.is_system}
                        onChange={e => updateLocal(a.id, { is_active: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-300"
                      />
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>Tip:</strong> Set opening balances to your bank balance and any starting capital on the day you began using EloNi.
          Anything before that date won&rsquo;t be in your invoices/expenses, so opening balances bridge the gap.
          The balance equation must hold: <strong>Assets = Liabilities + Equity</strong>.
        </p>
      </div>
    </div>
  )
}
