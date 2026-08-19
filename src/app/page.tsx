import Link from "next/link";

const FEATURES = [
  {
    icon: "🤖",
    title: "AI Notice Reply Engine",
    desc: "Upload any income tax or GST notice. AI reads it and drafts a complete legal reply with exact section citations in 90 seconds. You review, edit and download.",
  },
  {
    icon: "🧾",
    title: "GST Reconciliation",
    desc: "Paste your GSTR-2B and purchase register. AI normalises messy data, matches invoices, finds mismatches and explains every discrepancy in plain English.",
  },
  {
    icon: "📱",
    title: "Smart Client Portal",
    desc: "Send clients a secure link. They register with phone OTP, set a PIN, enable fingerprint login. No WhatsApp juggling. Documents arrive directly in your dashboard.",
  },
  {
    icon: "📅",
    title: "Compliance Calendar",
    desc: "Auto-generates GST, ITR, TDS, ROC deadlines for all your clients based on their services. Never miss a filing date again.",
  },
  {
    icon: "💰",
    title: "Billing & Invoicing",
    desc: "Create GST invoices in seconds. Track sent, paid and overdue invoices. See your outstanding amount at a glance.",
  },
  {
    icon: "📊",
    title: "Practice Analytics",
    desc: "See your revenue, client growth, AI usage and compliance rate in one dashboard. Know exactly how your practice is performing.",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "₹1,999",
    annual: "₹19,990",
    clients: "25",
    color: "border-gray-200",
    popular: false,
  },
  {
    name: "Professional",
    price: "₹4,999",
    annual: "₹49,990",
    clients: "100",
    color: "border-blue-500",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "₹9,999",
    annual: "₹99,990",
    clients: "Unlimited",
    color: "border-gray-200",
    popular: false,
  },
];

const TESTIMONIALS = [
  {
    name: "CA Priya Sharma",
    firm: "Sharma & Associates, Mumbai",
    text: "The notice reply engine saves me 3-4 hours per notice. I just review the AI draft, make minor edits and it is done. My clients are impressed with how fast I respond.",
  },
  {
    name: "CA Rajan Mehta",
    firm: "Mehta Tax Consultants, Ahmedabad",
    text: "GST reconciliation used to take my article 2 days per client. Now it takes 5 minutes. The AI even explains why each mismatch happened.",
  },
  {
    name: "CA Deepika Nair",
    firm: "Nair & Co, Bangalore",
    text: "My clients love the portal. They upload documents from their phone like sending a WhatsApp message. No more chasing people on WhatsApp.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 min-h-16 flex items-center justify-between gap-3">
          <span className="text-xl font-bold text-blue-600">CA Saathi</span>
          <div className="flex items-center gap-1 sm:gap-4">
            <Link
              href="#pricing"
              className="hidden min-h-11 items-center px-2 text-sm text-gray-600 hover:text-gray-900 sm:inline-flex"
            >
              Pricing
            </Link>
            <Link href="/login" className="btn-secondary px-3 text-sm sm:px-4">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary px-3 text-sm sm:px-4">
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-12 text-center sm:pt-20 sm:pb-16">
        <div className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full mb-6">
          Built exclusively for Indian Chartered Accountants
        </div>
        <h1 className="text-4xl font-bold text-gray-900 leading-tight max-w-3xl mx-auto sm:text-5xl">
          One CA with CA Saathi operates like a{" "}
          <span className="text-blue-600">5-person firm</span>
        </h1>
        <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto leading-relaxed sm:text-xl">
          AI-powered notice replies, GST reconciliation, and client document
          management. Built for India. Priced for India.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 mt-8 sm:flex-row sm:gap-4">
          <Link
            href="/register"
            className="inline-flex min-h-11 w-full items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-xl text-base font-medium hover:bg-blue-700 transition-colors sm:w-auto"
          >
            Start free 30-day trial
          </Link>
          <span className="text-sm text-gray-400">No credit card required</span>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          DPDP Act 2023 compliant · Data stored in India · Secure
        </p>
      </section>

      {/* Stats */}
      <section className="bg-blue-600 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 gap-6 text-center text-white sm:grid-cols-4 sm:gap-8">
            {[
              { value: "90s", label: "Notice reply drafted" },
              { value: "5 min", label: "GST recon completed" },
              { value: "₹0", label: "Setup cost" },
              { value: "30 day", label: "Free trial" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-bold">{s.value}</p>
                <p className="text-blue-200 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Everything your practice needs
        </h2>
        <p className="text-gray-500 text-center mb-12">
          Six powerful modules. One simple subscription.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow"
            >
              <p className="text-3xl mb-3">{f.icon}</p>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How Notice AI works
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 sm:gap-4">
            {[
              {
                step: "1",
                title: "Upload notice",
                desc: "Upload the PDF or image of the tax notice",
              },
              {
                step: "2",
                title: "AI reads it",
                desc: "AI extracts notice type, section and key details",
              },
              {
                step: "3",
                title: "Draft generated",
                desc: "Complete legal reply with citations in 90 seconds",
              },
              {
                step: "4",
                title: "You review",
                desc: "Edit freely, mark reviewed, download PDF",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{s.title}</h4>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Trusted by Indian CAs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="p-6 border border-gray-100 rounded-2xl"
            >
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                &ldquo;{t.text}&rdquo;
              </p>
              <div>
                <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.firm}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-500 text-center mb-12">
            3-year price lock on annual plans. Cancel anytime.
          </p>
          <div className="grid gap-6 max-w-4xl mx-auto md:grid-cols-3">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={`relative bg-white rounded-2xl border-2 p-5 text-center sm:p-6 md:text-left ${p.color}`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {p.name}
                </h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {p.price}
                  <span className="text-sm font-normal text-gray-500">
                    /month
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or {p.annual}/year (save 2 months)
                </p>
                <p className="text-sm text-gray-700 mt-4">
                  Up to <strong>{p.clients}</strong> clients
                </p>
                <Link
                  href="/register"
                  className={`flex min-h-11 items-center justify-center text-center mt-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    p.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">
            All plans include 30-day free trial · No credit card required
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to modernise your practice?
          </h2>
          <p className="text-blue-200 mb-8">
            Join hundreds of Indian CAs who are saving 10+ hours every week with
            CA Saathi.
          </p>
          <Link
            href="/register"
            className="bg-white text-blue-600 px-8 py-4 rounded-xl text-base font-medium hover:bg-blue-50 transition-colors inline-block"
          >
            Start your free 30-day trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <span className="text-gray-500 text-sm">
            © 2026 CA Saathi. Built for Indian CAs.
          </span>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-600">
              Terms
            </Link>
            <Link href="/login" className="hover:text-gray-600">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
