import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import { Plus, Download } from 'lucide-react'
import type { Expense } from '@/types'
import DeleteExpenseButton from '@/components/DeleteExpenseButton'

export const metadata = { title: 'Expenses' }

const CATEGORIES = ['All', 'Software', 'Travel', 'Office', 'Marketing', 'Equipment', 'Meals', 'Professional', 'Other'] as const

const CAT_COLORS: Record<string, string> = {
  Software:     'text-violet-700 bg-violet-50',
  Travel:       'text-blue-700 bg-blue-50',
  Office:       'text-zinc-600 bg-zinc-100',
  Marketing:    'text-pink-700 bg-pink-50',
  Equipment:    'text-orange-700 bg-orange-50',
  Meals:        'text-amber-700 bg-amber-50',
  Professional: 'text-teal-700 bg-teal-50',
  Other:        'text-zinc-500 bg-zinc-100',
}

interface Props { searchParams: Promise<{ cat?: string; q?: string }> }

export default async function ExpensesPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const params = await searchParams
  const cat = params.cat ?? 'All'
  const q = params.q ?? ''

  const { data: org } = await supabase.from('organisations').select('id,default_currency').eq('user_id', user.id).single()

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('org_id', org?.id ?? '')
    .order('date', { ascending: false })

  if (cat !== 'All') query = query.eq('category', cat)

  const { data } = await query as { data: Expense[] | null }

  const all = data ?? []
  const rows = q
    ? all.filter(e => e.description.toLowerCase().includes(q.toLowerCase()) || e.category.toLowerCase().includes(q.toLowerCase()))
    : all

  const total = rows.reduce((s, e) => s + e.amount, 0)
  const cur = org?.default_currency ?? 'GBP'

  const href = (c: string) =>
    `/expenses${c !== 'All' ? `?cat=${c}` : ''}${q ? `${c !== 'All' ? '&' : '?'}q=${encodeURIComponent(q)}` : ''}`

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Expenses</h1>
          {rows.length > 0 && (
            <p className="text-sm text-zinc-400 mt-0.5">{rows.length} expense{rows.length !== 1 ? 's' : ''} · {formatMoney(total, cur)} total</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export/expenses"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium transition-colors"
          >
            <Download size={14} />
            Export
          </a>
          <Link href="/expenses/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors">
            <Plus size={14} strokeWidth={2.5} />
            Add expense
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form method="GET" className="flex-1">
          {cat !== 'All' && <input type="hidden" name="cat" value={cat} />}
          <input name="q" defaultValue={q} type="search"
            placeholder="Search expenses..."
            className="w-full h-9 px-3 rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors" />
        </form>
        <div className="flex gap-1 overflow-x-auto pb-1 shrink-0">
          {CATEGORIES.map(c => (
            <Link key={c} href={href(c)}
              className={`h-9 px-3 rounded-md text-[13px] font-medium capitalize transition-colors inline-flex items-center whitespace-nowrap ${
                cat === c
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
              }`}>
              {c}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-400 mb-3">
              {q || cat !== 'All' ? 'No results found' : 'No expenses yet'}
            </p>
            {!q && cat === 'All' && (
              <Link href="/expenses/new" className="inline-flex items-center gap-1.5 text-sm text-zinc-900 font-medium hover:underline">
                <Plus size={13} /> Add your first expense
              </Link>
            )}
          </div>
        ) : (
          <>
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wide px-5 py-2.5">Description</th>
                  <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wide px-4 py-2.5">Category</th>
                  <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wide px-4 py-2.5">Date</th>
                  <th className="text-right text-[11px] font-medium text-zinc-400 uppercase tracking-wide px-5 py-2.5">Amount</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {rows.map(exp => (
                  <tr key={exp.id} className="hover:bg-zinc-50/60 transition-colors group">
                    <td className="px-5 py-3 text-sm text-zinc-900">{exp.description}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${CAT_COLORS[exp.category] ?? CAT_COLORS.Other}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{formatDate(exp.date)}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-zinc-900">{formatMoney(exp.amount, exp.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/expenses/${exp.id}/edit`} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Edit</Link>
                        <DeleteExpenseButton expenseId={exp.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="md:hidden divide-y divide-zinc-100">
              {rows.map(exp => (
                <div key={exp.id} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{exp.description}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{exp.category} · {formatDate(exp.date)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-medium text-zinc-900">{formatMoney(exp.amount, exp.currency)}</span>
                    <Link href={`/expenses/${exp.id}/edit`} className="text-xs text-zinc-400 hover:text-zinc-700">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
