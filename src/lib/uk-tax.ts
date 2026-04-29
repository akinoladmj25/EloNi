/**
 * UK tax calculations for tax year 2024-25 (6 April 2024 - 5 April 2025)
 * Rates apply to England, Wales, and Northern Ireland.
 * Scotland has different income tax bands - not yet supported.
 */

export const TAX_YEAR_LABEL = '2024-25'

// ── Income tax (England/Wales/NI) ────────────────────────────────────────
const PERSONAL_ALLOWANCE = 12_570
const PA_TAPER_THRESHOLD = 100_000      // PA reduces by £1 for every £2 above this
const BASIC_BAND_TOP     = 50_270        // basic rate ends here
const HIGHER_BAND_TOP    = 125_140       // higher rate ends, additional begins
const BASIC_RATE         = 0.20
const HIGHER_RATE        = 0.40
const ADDITIONAL_RATE    = 0.45

// ── National Insurance (self-employed, 2024-25) ──────────────────────────
const NI_LOWER_PROFITS_LIMIT  = 12_570    // Class 4 starts here
const NI_UPPER_PROFITS_LIMIT  = 50_270    // Class 4 main rate ends here
const CLASS_4_MAIN_RATE       = 0.06       // reduced from 9% in April 2024
const CLASS_4_UPPER_RATE      = 0.02

// ── Corporation tax (financial year 2024-25) ─────────────────────────────
const CT_SMALL_PROFITS_RATE = 0.19
const CT_MAIN_RATE          = 0.25
const CT_LOWER_LIMIT        = 50_000       // small profits rate up to here
const CT_UPPER_LIMIT        = 250_000      // main rate from here
const CT_MARGINAL_FRACTION  = 3 / 200      // standard fraction

// ── VAT ──────────────────────────────────────────────────────────────────
export const VAT_STANDARD_RATE = 0.20
export const VAT_REGISTRATION_THRESHOLD = 90_000

export interface IncomeTaxBreakdown {
  taxableIncome: number
  personalAllowance: number
  basicRate:    { taxable: number; tax: number }
  higherRate:   { taxable: number; tax: number }
  additionalRate: { taxable: number; tax: number }
  total: number
}

export function calculateIncomeTax(profit: number): IncomeTaxBreakdown {
  if (profit <= 0) {
    return {
      taxableIncome: 0,
      personalAllowance: PERSONAL_ALLOWANCE,
      basicRate:    { taxable: 0, tax: 0 },
      higherRate:   { taxable: 0, tax: 0 },
      additionalRate: { taxable: 0, tax: 0 },
      total: 0,
    }
  }

  // Tapered personal allowance above £100k
  let pa = PERSONAL_ALLOWANCE
  if (profit > PA_TAPER_THRESHOLD) {
    const taper = Math.floor((profit - PA_TAPER_THRESHOLD) / 2)
    pa = Math.max(0, PERSONAL_ALLOWANCE - taper)
  }

  const taxable = Math.max(0, profit - pa)

  const basicBandSize  = BASIC_BAND_TOP  - PERSONAL_ALLOWANCE   // £37,700
  const higherBandSize = HIGHER_BAND_TOP - BASIC_BAND_TOP        // £74,870

  const basicTaxable      = Math.min(taxable, basicBandSize)
  const higherTaxable     = Math.min(Math.max(0, taxable - basicBandSize), higherBandSize)
  const additionalTaxable = Math.max(0, taxable - basicBandSize - higherBandSize)

  const basicTax      = basicTaxable      * BASIC_RATE
  const higherTax     = higherTaxable     * HIGHER_RATE
  const additionalTax = additionalTaxable * ADDITIONAL_RATE

  return {
    taxableIncome: taxable,
    personalAllowance: pa,
    basicRate:    { taxable: basicTaxable,      tax: basicTax },
    higherRate:   { taxable: higherTaxable,     tax: higherTax },
    additionalRate: { taxable: additionalTaxable, tax: additionalTax },
    total: basicTax + higherTax + additionalTax,
  }
}

export interface NationalInsuranceBreakdown {
  class4Main: { profits: number; ni: number }
  class4Upper: { profits: number; ni: number }
  total: number
}

export function calculateNationalInsurance(profit: number): NationalInsuranceBreakdown {
  if (profit <= NI_LOWER_PROFITS_LIMIT) {
    return {
      class4Main:  { profits: 0, ni: 0 },
      class4Upper: { profits: 0, ni: 0 },
      total: 0,
    }
  }

  const mainBandProfits  = Math.min(profit, NI_UPPER_PROFITS_LIMIT) - NI_LOWER_PROFITS_LIMIT
  const upperBandProfits = Math.max(0, profit - NI_UPPER_PROFITS_LIMIT)

  const mainNi  = mainBandProfits  * CLASS_4_MAIN_RATE
  const upperNi = upperBandProfits * CLASS_4_UPPER_RATE

  return {
    class4Main:  { profits: mainBandProfits,  ni: mainNi },
    class4Upper: { profits: upperBandProfits, ni: upperNi },
    total: mainNi + upperNi,
  }
}

export interface CorporationTaxBreakdown {
  profit: number
  effectiveRate: number
  marginalRelief: number
  total: number
  band: 'small' | 'marginal' | 'main'
}

export function calculateCorporationTax(profit: number): CorporationTaxBreakdown {
  if (profit <= 0) {
    return { profit: 0, effectiveRate: 0, marginalRelief: 0, total: 0, band: 'small' }
  }

  if (profit <= CT_LOWER_LIMIT) {
    const tax = profit * CT_SMALL_PROFITS_RATE
    return { profit, effectiveRate: CT_SMALL_PROFITS_RATE, marginalRelief: 0, total: tax, band: 'small' }
  }

  if (profit >= CT_UPPER_LIMIT) {
    const tax = profit * CT_MAIN_RATE
    return { profit, effectiveRate: CT_MAIN_RATE, marginalRelief: 0, total: tax, band: 'main' }
  }

  // Marginal relief: tax = main rate × profits − fraction × (upper − profits)
  const mainTax = profit * CT_MAIN_RATE
  const relief  = CT_MARGINAL_FRACTION * (CT_UPPER_LIMIT - profit)
  const tax     = mainTax - relief
  const effectiveRate = tax / profit

  return { profit, effectiveRate, marginalRelief: relief, total: tax, band: 'marginal' }
}

export interface SoleTraderEstimate {
  profit: number
  incomeTax: IncomeTaxBreakdown
  nationalInsurance: NationalInsuranceBreakdown
  totalTaxAndNi: number
  netAfterTax: number
}

export function estimateSoleTraderTax(profit: number): SoleTraderEstimate {
  const incomeTax = calculateIncomeTax(profit)
  const ni        = calculateNationalInsurance(profit)
  const total     = incomeTax.total + ni.total
  return {
    profit,
    incomeTax,
    nationalInsurance: ni,
    totalTaxAndNi: total,
    netAfterTax: profit - total,
  }
}

export interface VatBreakdown {
  outputVat: number   // VAT charged on sales (collected from customers)
  inputVat:  number   // VAT paid on purchases (reclaimable)
  vatDue:    number   // outputVat − inputVat (positive = owed to HMRC, negative = refund)
}

export function calculateVat(outputVat: number, inputVat: number): VatBreakdown {
  return {
    outputVat,
    inputVat,
    vatDue: outputVat - inputVat,
  }
}

// ── UK tax year helpers ───────────────────────────────────────────────────

/** UK tax year runs 6 April → 5 April next year. */
export function currentTaxYearRange(): { from: string; to: string; label: string } {
  const today = new Date()
  const year = today.getFullYear()
  const taxYearStart = new Date(year, 3, 6) // 6 April

  if (today < taxYearStart) {
    // We're before 6 April this calendar year, so we're in last year's tax year
    return {
      from: `${year - 1}-04-06`,
      to:   `${year}-04-05`,
      label: `${(year - 1).toString().slice(2)}-${year.toString().slice(2)}`,
    }
  }
  return {
    from: `${year}-04-06`,
    to:   `${year + 1}-04-05`,
    label: `${year.toString().slice(2)}-${(year + 1).toString().slice(2)}`,
  }
}

export function previousTaxYearRange(): { from: string; to: string; label: string } {
  const cur = currentTaxYearRange()
  const fromYear = parseInt(cur.from.slice(0, 4)) - 1
  const toYear   = parseInt(cur.to.slice(0, 4)) - 1
  return {
    from: `${fromYear}-04-06`,
    to:   `${toYear}-04-05`,
    label: `${fromYear.toString().slice(2)}-${toYear.toString().slice(2)}`,
  }
}

/** Self-assessment payment dates for a given tax year ending in April. */
export function selfAssessmentDates(taxYearEndYear: number): {
  balancingPayment: string
  firstPaymentOnAccount: string
  secondPaymentOnAccount: string
} {
  return {
    balancingPayment:        `${taxYearEndYear + 1}-01-31`,
    firstPaymentOnAccount:   `${taxYearEndYear + 1}-01-31`,
    secondPaymentOnAccount:  `${taxYearEndYear + 1}-07-31`,
  }
}

// ── VAT Return (9-box) ──────────────────────────────────────────────────

export interface VatReturn {
  box1: number  // VAT due on sales and other outputs
  box2: number  // VAT due on acquisitions from NI/EU
  box3: number  // Total VAT due (box1 + box2)
  box4: number  // VAT reclaimed on purchases and other inputs
  box5: number  // Net VAT to pay or reclaim (box3 - box4)
  box6: number  // Total value of sales (excluding VAT)
  box7: number  // Total value of purchases (excluding VAT)
  box8: number  // Goods to NI/EU (most UK businesses: 0)
  box9: number  // Goods from NI/EU (most UK businesses: 0)
}

export function calculateVatReturn(input: {
  outputVat: number      // sum of tax_amount on paid invoices in period
  inputVat:  number      // sum of vat_amount on reclaimable expenses in period
  totalSalesExVat:     number  // sum of subtotal on paid invoices
  totalPurchasesExVat: number  // sum of (amount - vat_amount) on expenses
}): VatReturn {
  const box1 = input.outputVat
  const box2 = 0
  const box3 = box1 + box2
  const box4 = input.inputVat
  const box5 = box3 - box4
  const box6 = input.totalSalesExVat
  const box7 = input.totalPurchasesExVat
  return { box1, box2, box3, box4, box5, box6, box7, box8: 0, box9: 0 }
}

/** UK VAT quarter presets: returns the 4 quarters ending in or before today. */
export function recentVatQuarters(count = 4): { label: string; from: string; to: string; due: string }[] {
  const quarters: { label: string; from: string; to: string; due: string }[] = []
  const now = new Date()
  // Find the last completed quarter end
  const m = now.getMonth()
  const y = now.getFullYear()
  let qEndMonth = Math.floor(m / 3) * 3 - 1   // last day of previous quarter
  let qEndYear = y
  if (qEndMonth < 0) { qEndMonth += 12; qEndYear -= 1 }

  for (let i = 0; i < count; i++) {
    const endDate   = new Date(qEndYear, qEndMonth + 1, 0) // last day of month
    const startDate = new Date(qEndYear, qEndMonth - 2, 1)
    const dueDate   = new Date(qEndYear, qEndMonth + 2, 7) // 1m + 7d after end
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const monthName = endDate.toLocaleString('en-GB', { month: 'short' })
    const startMonth = startDate.toLocaleString('en-GB', { month: 'short' })
    quarters.push({
      label: `${startMonth} – ${monthName} ${endDate.getFullYear()}`,
      from: fmt(startDate),
      to:   fmt(endDate),
      due:  fmt(dueDate),
    })
    // Move back 3 months
    qEndMonth -= 3
    if (qEndMonth < 0) { qEndMonth += 12; qEndYear -= 1 }
  }
  return quarters
}

// ── Self-Assessment SA103 category mapping ─────────────────────────────

export const SA103_CATEGORIES = {
  Software:     { line: 'Phone, fax, stationery and other office costs',     box: 'box20' },
  Travel:       { line: 'Car, van and travel expenses',                       box: 'box18' },
  Office:       { line: 'Rent, rates, power and insurance costs',             box: 'box19' },
  Marketing:    { line: 'Advertising and business entertainment costs',       box: 'box21' },
  Equipment:    { line: 'Other business expenses',                            box: 'box26' },
  Meals:        { line: 'Car, van and travel expenses (subsistence)',         box: 'box18' },
  Professional: { line: 'Accountancy, legal and other professional fees',     box: 'box24' },
  Other:        { line: 'Other business expenses',                            box: 'box26' },
} as const

