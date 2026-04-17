import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Welcome to EloNi' }

const CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN', 'CAD', 'AUD', 'GHS', 'KES', 'ZAR', 'CHF', 'JPY']

async function createOrganisation(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const country = formData.get('country') as string
  const default_currency = formData.get('default_currency') as string
  const invoice_prefix = (formData.get('invoice_prefix') as string) || 'INV'

  await supabase.from('organisations').insert({
    name,
    email: email || null,
    country: country || null,
    default_currency,
    invoice_prefix,
    invoice_next_number: 1000,
    quote_prefix: 'QUO',
    quote_next_number: 1000,
    tax_name: 'VAT',
    user_id: user.id,
  })

  redirect('/dashboard')
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (org) redirect('/dashboard')

  const inp = 'w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors'
  const lbl = 'block text-xs font-medium text-zinc-500 mb-1.5'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f4f4f5 100%)' }}
    >
      <div className="w-full max-w-lg">
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold tracking-tight">ELN</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-8" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-1.5">Welcome to EloNi</h1>
            <p className="text-sm text-zinc-500">Let's get your business set up. It takes 30 seconds.</p>
          </div>

          <form action={createOrganisation} className="space-y-4">
            <div>
              <label className={lbl}>
                Business name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Acme Ltd"
                className={inp}
                autoFocus
              />
            </div>

            <div>
              <label className={lbl}>Business email</label>
              <input
                type="email"
                name="email"
                placeholder="hello@yourbusiness.com"
                className={inp}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Country</label>
                <input
                  type="text"
                  name="country"
                  placeholder="e.g. United Kingdom"
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Default currency</label>
                <select name="default_currency" defaultValue="GBP" className={inp}>
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={lbl}>Invoice prefix</label>
              <input
                type="text"
                name="invoice_prefix"
                placeholder="INV"
                defaultValue="INV"
                className={inp}
              />
              <p className="text-[11px] text-zinc-400 mt-1">Your invoices will be numbered INV-1000, INV-1001, etc.</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors"
              >
                Get started →
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
