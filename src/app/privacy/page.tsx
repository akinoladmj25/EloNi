import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — EloNi' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 px-6 h-14 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
            <span className="text-white font-black text-[10px] tracking-tighter">ELN</span>
          </div>
          <span className="font-bold text-zinc-900 text-sm">EloNi</span>
        </Link>
        <Link href="/signup" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Back to sign up</Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-400 mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-600">
          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">1. Information We Collect</h2>
            <p>We collect information you provide when you create an account (email, name), set up your business profile (business name, address, logo), and create invoices, quotes, and client records. We also collect usage data such as login timestamps and feature usage to improve the service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve the EloNi service, send transactional emails (invoices, quotes) on your behalf, and communicate important service updates. We do not use your data for advertising purposes.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">3. Data Storage and Security</h2>
            <p>Your data is stored securely using Supabase with row-level security — meaning your data is only accessible by you. We use industry-standard encryption for data in transit (TLS) and at rest. We do not share your data with third parties except as required to provide the service (e.g., email delivery).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">4. Client Data</h2>
            <p>When you add client information or send invoices via email, you are responsible for having appropriate consent from your clients to store and use their data. We process this data solely on your behalf and do not contact your clients independently.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">5. Cookies</h2>
            <p>We use essential cookies only — specifically, a session cookie to keep you logged in. We do not use tracking or advertising cookies. You can disable cookies in your browser, but this will prevent you from staying logged in.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">6. Your Rights</h2>
            <p>You have the right to access, export, or delete your data at any time. To request a data export or account deletion, contact us at <a href="mailto:support@eloni.app" className="text-zinc-900 underline hover:no-underline">support@eloni.app</a>. We will process requests within 30 days.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">7. Third-Party Services</h2>
            <p>EloNi uses Supabase for database and authentication, and Resend for transactional email delivery. These services have their own privacy policies. We only share the minimum data necessary with these providers.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">8. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of significant changes via email or a notice in the app. Continued use of EloNi after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">9. Contact</h2>
            <p>For privacy questions or requests, contact us at <a href="mailto:support@eloni.app" className="text-zinc-900 underline hover:no-underline">support@eloni.app</a>.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
