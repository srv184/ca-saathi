export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            CA Saathi
          </h1>
          <p className="text-blue-300 mt-1 text-sm">
            Practice management for Indian CAs
          </p>
        </div>
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">{children}</div>
        {/* Footer */}
        <p className="text-center text-blue-400 text-xs mt-6">
          Secure · DPDP Act 2023 compliant · Data stored in India
        </p>
      </div>
    </div>
  );
}
