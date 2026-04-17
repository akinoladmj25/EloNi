'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Organisation } from '@/types'

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

interface SettingsFormProps {
  org: Organisation | null
  userId: string
}

export default function SettingsForm({ org, userId }: SettingsFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: org?.name ?? '',
    email: org?.email ?? '',
    phone: org?.phone ?? '',
    address: org?.address ?? '',
    city: org?.city ?? '',
    state: org?.state ?? '',
    postcode: org?.postcode ?? '',
    country: org?.country ?? '',
    website: org?.website ?? '',
    default_currency: org?.default_currency ?? 'GBP',
    invoice_prefix: org?.invoice_prefix ?? 'INV',
    quote_prefix: org?.quote_prefix ?? 'QUO',
    tax_name: org?.tax_name ?? 'VAT',
    stripe_secret_key: org?.stripe_secret_key ?? '',
    stripe_publishable_key: org?.stripe_publishable_key ?? '',
    paypal_client_id: org?.paypal_client_id ?? '',
    paypal_client_secret: org?.paypal_client_secret ?? '',
    paystack_public_key: org?.paystack_public_key ?? '',
    paystack_secret_key: org?.paystack_secret_key ?? '',
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(org?.logo_url ?? null)

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const url = URL.createObjectURL(file)
    setLogoPreview(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Business name is required'); return }
    setSaving(true)
    setError('')
    setSaved(false)

    const supabase = createClient()

    let logoUrl = org?.logo_url ?? null

    // Upload logo if changed
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `logos/${userId}/${Date.now()}.${ext}`
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('eloni-assets')
        .upload(path, logoFile, { upsert: true })

      if (uploadError) {
        setError(`Logo upload failed: ${uploadError.message}`)
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage.from('eloni-assets').getPublicUrl(uploadData.path)
      logoUrl = urlData.publicUrl
    }

    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      postcode: form.postcode || null,
      country: form.country || null,
      website: form.website || null,
      default_currency: form.default_currency,
      invoice_prefix: form.invoice_prefix,
      quote_prefix: form.quote_prefix,
      tax_name: form.tax_name,
      logo_url: logoUrl,
      stripe_secret_key: form.stripe_secret_key || null,
      stripe_publishable_key: form.stripe_publishable_key || null,
      paypal_client_id: form.paypal_client_id || null,
      paypal_client_secret: form.paypal_client_secret || null,
      paystack_public_key: form.paystack_public_key || null,
      paystack_secret_key: form.paystack_secret_key || null,
    }

    if (org) {
      const { error: dbError } = await supabase
        .from('organisations')
        .update(payload)
        .eq('id', org.id)
      if (dbError) { setError(dbError.message); setSaving(false); return }
    } else {
      const { error: dbError } = await supabase
        .from('organisations')
        .insert({ ...payload, user_id: userId })
      if (dbError) { setError(dbError.message); setSaving(false); return }
    }

    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  const inputClass = 'w-full h-9 px-3 rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors'
  const labelClass = 'block text-xs font-medium text-zinc-500 mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-md">{error}</div>
      )}
      {saved && (
        <div className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2.5 rounded-md">Settings saved successfully.</div>
      )}

      {/* Business Profile */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-5">Business Profile</h2>

        {/* Logo */}
        <div className="mb-5">
          <label className={labelClass}>Business Logo</label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-16 h-16 object-contain rounded-md border border-zinc-200 bg-zinc-100 p-1" />
            ) : (
              <div className="w-16 h-16 bg-zinc-100 rounded-md border border-zinc-200 flex items-center justify-center">
                <span className="text-zinc-400 text-xs">No logo</span>
              </div>
            )}
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 h-9 border border-zinc-200 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                <span>Choose file</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoChange}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-zinc-400 mt-1">PNG, JPG, SVG or WebP up to 2MB</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Business Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              placeholder="Acme Design Studio"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Business Email</label>
            <input
              type="email"
              placeholder="hello@acme.com"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="tel"
              placeholder="+44 20 7946 0000"
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input
              type="url"
              placeholder="https://acme.com"
              value={form.website}
              onChange={e => handleChange('website', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-5">Business Address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Street Address</label>
            <input
              type="text"
              placeholder="123 High Street"
              value={form.address}
              onChange={e => handleChange('address', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              placeholder="London"
              value={form.city}
              onChange={e => handleChange('city', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>State / County</label>
            <input
              type="text"
              placeholder="England"
              value={form.state}
              onChange={e => handleChange('state', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Postcode / ZIP</label>
            <input
              type="text"
              placeholder="SW1A 1AA"
              value={form.postcode}
              onChange={e => handleChange('postcode', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input
              type="text"
              placeholder="United Kingdom"
              value={form.country}
              onChange={e => handleChange('country', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Invoice Preferences */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-5">Invoice Preferences</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <label className={labelClass}>Default Currency</label>
            <select
              value={form.default_currency}
              onChange={e => handleChange('default_currency', e.target.value)}
              className={inputClass}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Invoice Prefix</label>
            <input
              type="text"
              placeholder="INV"
              value={form.invoice_prefix}
              onChange={e => handleChange('invoice_prefix', e.target.value.toUpperCase())}
              className={inputClass}
            />
            <p className="text-xs text-zinc-400 mt-1">e.g. INV generates INV-1000</p>
          </div>
          <div>
            <label className={labelClass}>Quote Prefix</label>
            <input
              type="text"
              placeholder="QUO"
              value={form.quote_prefix}
              onChange={e => handleChange('quote_prefix', e.target.value.toUpperCase())}
              className={inputClass}
            />
            <p className="text-xs text-zinc-400 mt-1">e.g. QUO generates QUO-1000</p>
          </div>
          <div>
            <label className={labelClass}>Tax Name</label>
            <input
              type="text"
              placeholder="VAT"
              value={form.tax_name}
              onChange={e => handleChange('tax_name', e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-zinc-400 mt-1">e.g. VAT, GST, Sales Tax</p>
          </div>
        </div>
      </div>

      {/* Payment Integrations */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Payment Integrations</h2>
        <p className="text-xs text-zinc-400 mb-5">Add your payment provider keys to enable online payments on invoices. Keys are stored securely and never shared.</p>

        {/* Stripe */}
        <div className="mb-6 pb-6 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#635bff' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.91 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-zinc-800">Stripe</span>
            {form.stripe_secret_key && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Connected</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Secret Key</label>
              <input
                type="password"
                placeholder="sk_live_…"
                value={form.stripe_secret_key}
                onChange={e => handleChange('stripe_secret_key', e.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </div>
            <div>
              <label className={labelClass}>Publishable Key</label>
              <input
                type="text"
                placeholder="pk_live_…"
                value={form.stripe_publishable_key}
                onChange={e => handleChange('stripe_publishable_key', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* PayPal */}
        <div className="mb-6 pb-6 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#ffc439' }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: '#003087' }}>PP</span>
            </div>
            <span className="text-sm font-medium text-zinc-800">PayPal</span>
            {form.paypal_client_id && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Connected</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Client ID</label>
              <input
                type="text"
                placeholder="AV…"
                value={form.paypal_client_id}
                onChange={e => handleChange('paypal_client_id', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Client Secret</label>
              <input
                type="password"
                placeholder="EH…"
                value={form.paypal_client_secret}
                onChange={e => handleChange('paypal_client_secret', e.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {/* Paystack */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#00c3f7' }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: 'white' }}>PS</span>
            </div>
            <span className="text-sm font-medium text-zinc-800">Paystack</span>
            {form.paystack_secret_key && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Connected</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Public Key</label>
              <input
                type="text"
                placeholder="pk_live_…"
                value={form.paystack_public_key}
                onChange={e => handleChange('paystack_public_key', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Secret Key</label>
              <input
                type="password"
                placeholder="sk_live_…"
                value={form.paystack_secret_key}
                onChange={e => handleChange('paystack_secret_key', e.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-sm font-medium text-white disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
