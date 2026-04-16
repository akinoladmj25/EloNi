'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft } from 'lucide-react'

interface NewClientFormProps {
  orgId: string
}

export default function NewClientForm({ orgId }: NewClientFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
  })

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Client name is required'); return }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: dbError } = await supabase.from('clients').insert({
      org_id: orgId,
      name: form.name,
      company: form.company || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      postcode: form.postcode || null,
      country: form.country || null,
    })

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    router.push('/clients')
  }

  const inp = 'w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors'
  const lbl = 'block text-xs font-medium text-zinc-500 mb-1.5'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          <ChevronLeft size={14} />
          Clients
        </Link>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-md">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="bg-white rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>Full Name <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="Jane Smith" value={form.name}
                onChange={e => handleChange('name', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Company</label>
              <input type="text" placeholder="Acme Ltd" value={form.company}
                onChange={e => handleChange('company', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" placeholder="jane@acme.com" value={form.email}
                onChange={e => handleChange('email', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <input type="tel" placeholder="+44 7700 900000" value={form.phone}
                onChange={e => handleChange('phone', e.target.value)} className={inp} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className={lbl}>Street Address</label>
              <input type="text" placeholder="123 High Street" value={form.address}
                onChange={e => handleChange('address', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>City</label>
              <input type="text" placeholder="London" value={form.city}
                onChange={e => handleChange('city', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>State / County</label>
              <input type="text" placeholder="England" value={form.state}
                onChange={e => handleChange('state', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Postcode / ZIP</label>
              <input type="text" placeholder="SW1A 1AA" value={form.postcode}
                onChange={e => handleChange('postcode', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Country</label>
              <input type="text" placeholder="United Kingdom" value={form.country}
                onChange={e => handleChange('country', e.target.value)} className={inp} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Link href="/clients"
            className="inline-flex items-center h-9 px-4 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-sm font-medium text-white disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Add Client'}
          </button>
        </div>
      </form>
    </div>
  )
}
