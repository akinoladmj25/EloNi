import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import type { Invoice, Expense } from '@/types'
import ReportsNav from '../ReportsNav'
import VatQuarterPicker from './VatQuarterPicker'
import PrintButton from './PrintButton'
import { calculateVatReturn, recentVatQuarters } from '@/lib/uk-tax'

export const metadata = { title: 'VAT Return' }

export default async function VatReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  // Default: most recent completed VAT quarter
  const quarters = recentVatQuarters(8)
  const from = sp.from ?? quarters[0].from
  const to   = sp.to   ?? quarters[0].to
  const matchedQuarter = quarters.find(q => q.from === from && q.to === to)
  const periodLabel = matchedQuarter?.label ?? `${formatDate(from)} – ${formatDate(to)}`
  const dueDate = matchedQuarter?.due

  const cur = org.default_currency

  const [{ data: rawInvoices }, { data: rawExpenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('status, total, subtotal, tax_amount, currency, paid_at')
      .eq('org_id', org.id)
      .eq('status', 'paid') as unknown as Promise<{ data: Pick<Invoice, 'status' | 'total' | 'subtotal' | 'tax_amount' | 'currency' | 'paid_at'>[] | null }>,
    supabase
      .from('expenses')
      .select('amount, vat_amount, vat_reclaimable, currency, date')
      .eq('org_id', org.id) as unknown as Promise<{ data: Pick<Expense, 'amount' | 'vat_amount' | 'vat_reclaimable' | 'currency' | 'date'>[] | null }>,
  ])

  // Cash basis: paid in period
  const inv = (rawInvoices ?? []).filter(i =>
    i.currency === cur && i.paid_at && i.paid_at >= from && i.paid_at <= to
  )
  const exp = (rawExpenses ?? []).filter(e =>
    e.currency === cur && e.date >= from && e.date <= to
  )

  const outputVat        = inv.reduce((s, i) => s + (i.tax_amount ?? 0), 0)
  const totalSalesExVat  = inv.reduce((s, i) => s + (i.subtotal ?? 0), 0)
  const inputVat         = exp.filter(e => e.vat_reclaimable !== false).reduce((s, e) => s + (e.vat_amount ?? 0), 0)
  const totalPurchasesExVat = exp.reduce((s, e) => s + ((e.amount ?? 0) - (e.vat_amount ?? 0)), 0)

  const vat = calculateVatReturn({ outputVat, inputVat, totalSalesExVat, totalPurchasesExVat })
  const refundDue = vat.box5 < 0
  const isVatReg = org.vat_registered === true

  return (
    <div className="p-4 md:p-8">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-3 print:hidden">
        <ChevronLeft size={14} />
        Back to Reports
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">VAT Return</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{periodLabel}{dueDate ? ` · Filing due ${formatDate(dueDate)}` : ''}</p>
        </div>
        <PrintButton />
      </div>

      <div className="print:hidden"><ReportsNav /></div>

      {!isVatReg && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-700 flex items-start gap-2 print:hidden">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <span>You aren&rsquo;t marked as VAT-registered in <Link href="/settings" className="underline font-semibold">settings</Link>. This return is shown for reference only.</span>
        </div>
      )}

      <div className="print:hidden mb-6">
        <VatQuarterPicker quarters={quarters} current={from} />
      </div>

      {/* The 9-box VAT return */}
      <div className="bg-white rounded-xl overflow-hidden mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-zinc-900">VAT Return — Standard 9-box</p>
            <p className="text-xs text-zinc-400 mt-0.5">{org.name}{org.vat_number ? ` · VAT no. ${org.vat_number}` : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Period</p>
            <p className="text-sm font-medium text-zinc-700">{formatDate(from)} – {formatDate(to)}</p>
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          <BoxRow box={1} label="VAT due in this period on sales and other outputs"               value={vat.box1} currency={cur} />
          <BoxRow box={2} label="VAT due on acquisitions of goods made in NI from EU member states" value={vat.box2} currency={cur} muted />
          <BoxRow box={3} label="Total VAT due (Boxes 1 + 2)"                                       value={vat.box3} currency={cur} bold />
          <BoxRow box={4} label="VAT reclaimed in this period on purchases and other inputs"       value={vat.box4} currency={cur} />
          <BoxRow box={5}
                  label={refundDue ? 'Net VAT to reclaim from HMRC (Box 4 − Box 3)' : 'Net VAT to pay to HMRC (Box 3 − Box 4)'}
                  value={Math.abs(vat.box5)}
                  currency={cur}
                  bold
                  highlight={refundDue ? 'green' : 'red'}
          />
          <BoxRow box={6} label="Total value of sales and other outputs (excluding VAT)"           value={vat.box6} currency={cur} />
          <BoxRow box={7} label="Total value of purchases and other inputs (excluding VAT)"        value={vat.box7} currency={cur} />
          <BoxRow box={8} label="Total value of dispatches of goods from NI to EU"                 value={vat.box8} currency={cur} muted />
          <BoxRow box={9} label="Total value of acquisitions of goods made in NI from EU"          value={vat.box9} currency={cur} muted />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 print:hidden">
        <SummaryCard title="Sales (ex VAT)"     value={vat.box6} currency={cur} sub={`${inv.length} invoices`} />
        <SummaryCard title="Purchases (ex VAT)" value={vat.box7} currency={cur} sub={`${exp.length} expenses`} />
        <SummaryCard
          title={refundDue ? 'VAT refund due' : 'VAT to pay HMRC'}
          value={Math.abs(vat.box5)}
          currency={cur}
          sub={dueDate ? `By ${formatDate(dueDate)}` : 'Due 1 month + 7 days after period end'}
          tone={refundDue ? 'green' : 'red'}
        />
      </div>

      {/* Filing reminder */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6 print:hidden">
        <p className="text-sm font-semibold text-blue-900 mb-1">How to file</p>
        <p className="text-xs text-blue-800 leading-relaxed">
          Under Making Tax Digital (MTD), you must submit this return through HMRC-recognised software.
          Use these figures as your source of truth, then enter them into your MTD bridging tool
          (or wait for our MTD submission feature in Phase 3). Print or export this page for your records and your accountant.
        </p>
      </div>

      <p className="text-[11px] text-zinc-400 text-center print:hidden">
        Calculated on cash basis. Paid invoices &amp; recorded expenses in the period are included.
      </p>
    </div>
  )
}

function BoxRow({ box, label, value, currency, bold, muted, highlight }: {
  box: number; label: string; value: number; currency: string; bold?: boolean; muted?: boolean; highlight?: 'red' | 'green'
}) {
  const valueClass =
    highlight === 'red' ? 'text-red-700' :
    highlight === 'green' ? 'text-emerald-700' :
    bold ? 'text-zinc-900' : muted ? 'text-zinc-400' : 'text-zinc-900'
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3.5 ${bold ? 'bg-zinc-50/60' : ''}`}>
      <div className="flex items-start gap-3 min-w-0">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold shrink-0 ${
          bold ? 'bg-zinc-900 text-white' : muted ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-100 text-zinc-700'
        }`}>{box}</span>
        <span className={`text-sm leading-relaxed ${bold ? 'font-semibold text-zinc-900' : muted ? 'text-zinc-400' : 'text-zinc-700'}`}>{label}</span>
      </div>
      <span className={`text-sm font-bold tracking-tight whitespace-nowrap ${valueClass}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(value, currency)}
      </span>
    </div>
  )
}

function SummaryCard({ title, value, currency, sub, tone }: {
  title: string; value: number; currency: string; sub: string; tone?: 'red' | 'green'
}) {
  const valueColor = tone === 'red' ? 'text-red-700' : tone === 'green' ? 'text-emerald-700' : 'text-zinc-900'
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">{title}</p>
      <p className={`text-xl font-bold tracking-tight ${valueColor}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(value, currency)}</p>
      <p className="text-[11px] text-zinc-400 mt-1">{sub}</p>
    </div>
  )
}
