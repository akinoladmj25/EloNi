/**
 * Computes Balance Sheet and Trial Balance from existing single-entry data
 * (invoices, expenses, opening balances on the chart of accounts).
 *
 * This is a hybrid approach: we don't yet have full double-entry journal
 * entries, but we derive ledger balances from the data we already have:
 *
 *   Bank balance        = opening balance + paid invoices − expenses
 *   Trade Receivables   = sum(invoices where status in sent/overdue) ex-VAT if VAT registered
 *   VAT control account = output VAT − input VAT (positive: payable, negative: reclaimable)
 *   Sales Income        = sum(paid invoices) ex-VAT
 *   Expense accounts    = sum(expenses by category)
 *   Retained Earnings   = cumulative net profit
 *
 * Manual adjustments (journal entries) come later — for now we expose
 * opening_balance per account so users can set starting positions.
 */

export type AccountType    = 'asset' | 'liability' | 'equity' | 'income' | 'expense'
export type AccountSubtype = 'current_asset' | 'fixed_asset' | 'contra_asset' | 'current_liability' | 'long_term' | 'cogs' | 'operating' | null

export interface Account {
  id:    string
  code:  string
  name:  string
  type:  AccountType
  subtype: AccountSubtype
  opening_balance: number
  is_system: boolean
  is_active: boolean
}

export interface InvoiceForAcct {
  status:     'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  total:      number
  subtotal:   number
  tax_amount: number
  currency:   string
  paid_at:    string | null
  issue_date: string
}

export interface ExpenseForAcct {
  amount:     number
  vat_amount: number
  currency:   string
  category:   string
  date:       string
}

export interface AccountBalance {
  account: Account
  balance: number   // signed: positive = natural-side balance (debit for assets/expenses, credit for liab/equity/income)
  debit:   number
  credit:  number
}

// Map expense categories to CoA codes
const CATEGORY_TO_CODE: Record<string, string> = {
  Software:     '6000',
  Travel:       '6100',
  Office:       '6200',
  Marketing:    '6300',
  Equipment:    '6400',
  Meals:        '6500',
  Professional: '6600',
  Other:        '9000',
}

/**
 * Compute account balances as at `asOfDate`.
 * Returns one entry per account with derived balance.
 */
export function computeAccountBalances(input: {
  accounts: Account[]
  invoices: InvoiceForAcct[]
  expenses: ExpenseForAcct[]
  asOfDate: string
  isVatRegistered: boolean
  defaultCurrency: string
}): AccountBalance[] {
  const { accounts, invoices, expenses, asOfDate, isVatRegistered, defaultCurrency } = input

  // Filter to default currency only — multi-currency BS needs FX revaluation (later)
  const inv = invoices.filter(i => i.currency === defaultCurrency)
  const exp = expenses.filter(e => e.currency === defaultCurrency)

  // Income recognised on cash basis (paid_at) — invoiced but unpaid is a receivable
  const paidInvoicesUpToDate = inv.filter(i => i.status === 'paid' && i.paid_at && i.paid_at <= asOfDate)
  const expensesUpToDate     = exp.filter(e => e.date <= asOfDate)

  // Outstanding receivables (sent + overdue, issued before asOfDate)
  const outstanding = inv.filter(i =>
    (i.status === 'sent' || i.status === 'overdue') &&
    i.issue_date <= asOfDate
  )

  // Aggregates
  const totalIncomeExVat = paidInvoicesUpToDate.reduce((s, i) => s + (isVatRegistered ? i.subtotal : i.total), 0)
  const totalIncomeIncVat = paidInvoicesUpToDate.reduce((s, i) => s + i.total, 0)
  const totalExpensesExVat = expensesUpToDate.reduce((s, e) => s + (isVatRegistered ? (e.amount - (e.vat_amount ?? 0)) : e.amount), 0)
  const totalExpensesIncVat = expensesUpToDate.reduce((s, e) => s + e.amount, 0)
  const totalReceivablesIncVat = outstanding.reduce((s, i) => s + i.total, 0)
  const totalReceivablesExVat = outstanding.reduce((s, i) => s + (isVatRegistered ? i.subtotal : i.total), 0)
  const totalOutputVat = paidInvoicesUpToDate.reduce((s, i) => s + (i.tax_amount ?? 0), 0)
  const totalInputVat = expensesUpToDate.reduce((s, e) => s + (e.vat_amount ?? 0), 0)

  const expensesByCode: Record<string, number> = {}
  for (const e of expensesUpToDate) {
    const code = CATEGORY_TO_CODE[e.category] ?? '9000'
    const ex = isVatRegistered ? (e.amount - (e.vat_amount ?? 0)) : e.amount
    expensesByCode[code] = (expensesByCode[code] ?? 0) + ex
  }

  // Net profit (current period not closed) drops into Retained Earnings
  const netProfit = totalIncomeExVat - totalExpensesExVat

  // Bank balance = opening (set on account 1000) + cash in − cash out
  const cashIn   = totalIncomeIncVat
  const cashOut  = totalExpensesIncVat

  return accounts.map(account => {
    const opening = account.opening_balance ?? 0
    let derived = 0

    switch (account.code) {
      case '1000': // Bank
        derived = opening + cashIn - cashOut
        break
      case '1100': // Trade Receivables
        derived = opening + totalReceivablesIncVat
        break
      case '1300': // VAT Reclaimable (only if input > output, otherwise payable)
        derived = opening + Math.max(0, totalInputVat - totalOutputVat)
        break
      case '2100': // VAT Payable (only if output > input)
        derived = opening + Math.max(0, totalOutputVat - totalInputVat)
        break
      case '3200': // Retained Earnings (cumulative profit)
        derived = opening + netProfit
        break
      case '4000': // Sales Income
        derived = opening + totalIncomeExVat
        break
      default:
        if (account.type === 'expense') {
          derived = opening + (expensesByCode[account.code] ?? 0)
        } else {
          derived = opening
        }
    }

    // Convert to debit/credit display
    const isDebitNatural = account.type === 'asset' || account.type === 'expense'
    const debit  = isDebitNatural && derived >= 0 ? derived : (!isDebitNatural && derived < 0 ? -derived : 0)
    const credit = !isDebitNatural && derived >= 0 ? derived : (isDebitNatural && derived < 0 ? -derived : 0)

    return { account, balance: derived, debit, credit }
  })
}

/**
 * Group balances by type/subtype for Balance Sheet display.
 */
export interface BalanceSheet {
  asOfDate: string
  currentAssets:      AccountBalance[]
  fixedAssets:        AccountBalance[]
  totalAssets:        number
  currentLiabilities: AccountBalance[]
  longTermLiabilities: AccountBalance[]
  totalLiabilities:   number
  equity:             AccountBalance[]
  totalEquity:        number
  totalLiabilitiesAndEquity: number
  isBalanced:         boolean   // assets == liabilities + equity (within rounding)
}

export function buildBalanceSheet(balances: AccountBalance[], asOfDate: string): BalanceSheet {
  const nonZero = balances.filter(b => Math.abs(b.balance) > 0.005 || b.account.is_system)

  const currentAssets       = nonZero.filter(b => b.account.type === 'asset' && b.account.subtype === 'current_asset')
  const fixedAssetsRaw      = nonZero.filter(b => b.account.type === 'asset' && (b.account.subtype === 'fixed_asset' || b.account.subtype === 'contra_asset'))
  const currentLiabilities  = nonZero.filter(b => b.account.type === 'liability' && b.account.subtype === 'current_liability')
  const longTermLiabilities = nonZero.filter(b => b.account.type === 'liability' && b.account.subtype === 'long_term')
  const equity              = nonZero.filter(b => b.account.type === 'equity')

  const sumOf = (xs: AccountBalance[]) => xs.reduce((s, b) => s + b.balance, 0)
  const totalAssets               = sumOf(currentAssets) + sumOf(fixedAssetsRaw)
  const totalLiabilities          = sumOf(currentLiabilities) + sumOf(longTermLiabilities)
  const totalEquity               = sumOf(equity)
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity

  return {
    asOfDate,
    currentAssets,
    fixedAssets:        fixedAssetsRaw,
    totalAssets,
    currentLiabilities,
    longTermLiabilities,
    totalLiabilities,
    equity,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
  }
}
