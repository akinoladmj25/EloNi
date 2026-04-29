export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'

export interface Organisation {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string | null
  website: string | null
  logo_url: string | null
  default_currency: string
  invoice_prefix: string
  invoice_next_number: number
  quote_prefix: string
  quote_next_number: number
  tax_name: string
  stripe_secret_key?: string | null
  stripe_publishable_key?: string | null
  paypal_client_id?: string | null
  paypal_client_secret?: string | null
  paystack_public_key?: string | null
  paystack_secret_key?: string | null
  business_type?: 'sole_trader' | 'limited_company' | 'partnership' | null
  vat_registered?: boolean | null
  vat_number?: string | null
  vat_scheme?: 'standard' | 'flat_rate' | 'cash' | null
  vat_flat_rate?: number | null
  created_at: string
}

export interface Client {
  id: string
  org_id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string | null
  created_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export interface Invoice {
  id: string
  org_id: string
  client_id: string | null
  invoice_number: string
  status: InvoiceStatus
  currency: string
  issue_date: string
  due_date: string | null
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  terms: string | null
  sent_at: string | null
  paid_at: string | null
  public_token: string | null
  client_viewed_at: string | null
  receipt_url?: string | null
  created_at: string
  updated_at: string
  // Joined fields
  client?: Client | null
  items?: InvoiceItem[]
}

export interface QuoteItem {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export interface Quote {
  id: string
  org_id: string
  client_id: string | null
  quote_number: string
  status: QuoteStatus
  currency: string
  issue_date: string
  expiry_date: string | null
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  terms: string | null
  sent_at: string | null
  accepted_at: string | null
  converted_invoice_id: string | null
  public_token: string | null
  created_at: string
  updated_at: string
  // Joined fields
  client?: Client | null
  items?: QuoteItem[]
}

export interface DashboardStats {
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  totalOverdue: number
  currency: string
}

export type ExpenseCategory = 'Software' | 'Travel' | 'Office' | 'Marketing' | 'Equipment' | 'Meals' | 'Professional' | 'Other'

export interface VatReturnRecord {
  id: string
  org_id: string
  period_from: string
  period_to: string
  box1: number
  box2: number
  box3: number
  box4: number
  box5: number
  box6: number
  box7: number
  box8: number
  box9: number
  status: 'draft' | 'submitted' | 'paid'
  submission_method: 'manual' | 'hmrc_mtd' | null
  hmrc_processing_date: string | null
  hmrc_form_bundle_number: string | null
  hmrc_charge_ref_number: string | null
  hmrc_payment_indicator: string | null
  submitted_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HmrcConnection {
  id: string
  org_id: string
  vat_number: string
  token_expires_at: string
  connected_at: string
  last_used_at: string | null
}

export interface Expense {
  id: string
  org_id: string
  description: string
  category: ExpenseCategory
  amount: number
  currency: string
  date: string
  notes: string | null
  receipt_url?: string | null
  vat_amount?: number | null
  vat_reclaimable?: boolean | null
  created_at: string
  updated_at: string
}

export interface RecurringInvoiceItem {
  id: string
  recurring_invoice_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export interface RecurringInvoice {
  id: string
  org_id: string
  client_id: string | null
  title: string
  currency: string
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually'
  next_date: string
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  terms: string | null
  active: boolean
  created_at: string
  updated_at: string
  client?: Client | null
  items?: RecurringInvoiceItem[]
}
