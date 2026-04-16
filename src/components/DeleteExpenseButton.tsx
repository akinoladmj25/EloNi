'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

export default function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('expenses').delete().eq('id', expenseId)
    router.refresh()
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button onClick={handleDelete} disabled={deleting}
          className="text-xs text-red-600 font-medium hover:text-red-800 disabled:opacity-50">
          {deleting ? '…' : 'Confirm'}
        </button>
        <button onClick={() => setConfirming(false)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
      </span>
    )
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="text-zinc-300 hover:text-red-500 transition-colors">
      <Trash2 size={13} />
    </button>
  )
}
