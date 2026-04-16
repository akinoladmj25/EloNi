'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

interface DeleteClientButtonProps {
  clientId: string
  clientName: string
}

export default function DeleteClientButton({ clientId, clientName }: DeleteClientButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete client "${clientName}"? This cannot be undone.`)) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('clients').delete().eq('id', clientId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
      title="Delete client"
    >
      <Trash2 size={15} />
    </button>
  )
}
