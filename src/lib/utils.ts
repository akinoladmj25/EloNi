import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  NGN: '₦',
  CAD: 'CA$',
  AUD: 'A$',
  GHS: 'GH₵',
  KES: 'KSh',
  ZAR: 'R',
  CHF: 'CHF',
  JPY: '¥',
}

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code
}

export function formatMoney(amount: number, currency: string = 'GBP'): string {
  const symbol = getCurrencySymbol(currency)

  // For currencies with ISO-style prefixes, put symbol before amount
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  return `${symbol}${formatted}`
}

export function generateInvoiceNumber(prefix: string, nextNumber: number): string {
  return `${prefix}-${nextNumber}`
}

export function generateQuoteNumber(prefix: string, nextNumber: number): string {
  return `${prefix}-${nextNumber}`
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
