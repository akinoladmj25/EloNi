export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col bg-[#0d0d0d] p-10 relative overflow-hidden">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Logo */}
        <div className="relative flex items-center gap-2.5 mb-auto">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
            <span className="text-[#0d0d0d] text-[11px] font-black tracking-tighter">ELN</span>
          </div>
          <span className="text-white font-bold text-[15px] tracking-tight">EloNi</span>
        </div>
        {/* Hero copy */}
        <div className="relative mt-auto">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Professional invoicing</p>
          <h2 className="text-[32px] font-bold text-white leading-[1.2] tracking-tight mb-5">
            Know the price.<br />Send the invoice.<br />Get paid.
          </h2>
          <p className="text-[14px] text-zinc-400 leading-relaxed max-w-xs">
            Everything freelancers and agencies need to invoice clients, track payments, and manage their finances — in one clean workspace.
          </p>
          {/* Feature list */}
          <div className="mt-8 space-y-2.5">
            {[
              'Invoices, quotes & receipts',
              'Client portal with online acceptance',
              'Expense tracking & P&L reports',
              'Recurring billing & reminders',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[13px] text-zinc-400">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo only */}
        <div className="lg:hidden flex items-center gap-2 mb-10 self-start max-w-sm w-full mx-auto">
          <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
            <span className="text-white text-[10px] font-black tracking-tighter">ELN</span>
          </div>
          <span className="font-bold text-zinc-900 text-[15px]">EloNi</span>
        </div>
        <div className="w-full max-w-[360px]">
          {children}
        </div>
      </div>
    </div>
  )
}
