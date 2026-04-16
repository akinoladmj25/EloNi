import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { generateInvoiceNumber } from "@/lib/utils"
import NewInvoiceForm from "./NewInvoiceForm"
import type { Client, Organisation } from "@/types"

export const metadata = { title: "New Invoice" }

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: org } = await supabase
    .from("organisations").select("*").eq("user_id", user.id).single() as { data: Organisation | null }

  if (!org) redirect("/settings")

  const { data: clients } = await supabase
    .from("clients").select("*").eq("org_id", org.id).order("name") as { data: Client[] | null }

  const defaultInvoiceNumber = generateInvoiceNumber(org.invoice_prefix, org.invoice_next_number)

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">New Invoice</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Fill in the details below</p>
      </div>
      <NewInvoiceForm org={org} clients={clients ?? []} defaultInvoiceNumber={defaultInvoiceNumber} />
    </div>
  )
}
