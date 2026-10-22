import Link from "next/link";
import Logo from "@/components/Logo";

export default function Terms() {
  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <Link href="/"><Logo /></Link>
          <Link href="/settings" className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white/85">← Settings</Link>
        </header>
        <article className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-[#132b40] via-[#102133] to-[#111923] p-5 shadow-xl shadow-black/20 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[.16em] text-amber-300">SAVIS · Kenya</p>
          <h1 className="mt-2 text-3xl font-black">Terms of use</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">Last updated: 22 October 2026 · Prototype terms for the current SAVIS marketplace test</p>
          <div className="mt-7 space-y-6 text-sm leading-7 text-white/80">
            <section><h2 className="font-extrabold text-white">1. About SAVIS</h2><p>SAVIS helps customers discover local service providers, professionals, producers and sellers. Some features are still being tested or developed; a feature shown in the interface is not necessarily available unless the app confirms it has completed successfully.</p></section>
            <section><h2 className="font-extrabold text-white">2. Accounts and accurate information</h2><p>You are responsible for keeping your login credentials private and providing accurate account, contact and profile information. Do not impersonate another person or use SAVIS to mislead, harass or defraud other users.</p></section>
            <section><h2 className="font-extrabold text-white">3. Provider profiles and verification</h2><p>Providers must submit the information and documents requested for verification. A pending submission is not an approval. Verification is a trust-and-safety check and should not be interpreted as a guarantee of a provider's work, qualifications or conduct.</p></section>
            <section><h2 className="font-extrabold text-white">4. Enquiries, quotes and work agreements</h2><p>Customers and providers should agree on the work scope, price, timing, materials and any extra charges before work begins. Users should keep relevant communications and confirm changes in writing. SAVIS does not guarantee that every listing, quote, schedule or user-provided statement is accurate.</p></section>
            <section><h2 className="font-extrabold text-white">5. Payments and fees</h2><p>Do not assume that a payment-protection, refund, wallet or membership feature is active unless the app explicitly confirms the transaction and its status. Do not share PINs, passwords or one-time security codes with another user.</p></section>
            <section><h2 className="font-extrabold text-white">6. Safe and lawful use</h2><p>Users must comply with applicable law, respect others, and not upload unlawful, harmful, misleading or infringing content. SAVIS may restrict access to accounts or content where necessary for security, compliance or marketplace safety.</p></section>
            <section><h2 className="font-extrabold text-white">7. Privacy and documents</h2><p>Personal information and verification documents should be handled only for legitimate marketplace and verification purposes. See the Privacy Policy for further information. Never upload documents belonging to someone else without lawful authority.</p></section>
            <section><h2 className="font-extrabold text-white">8. Service availability and changes</h2><p>SAVIS is an evolving service and may change, pause or remove features. We will aim to make important changes clear in the app. Keep your own records of agreements and transactions.</p></section>
            <section><h2 className="font-extrabold text-white">9. Contact and questions</h2><p>If a problem arises, use the support/contact option available in SAVIS. These prototype terms are a practical starting point, not a substitute for legal advice or a final legal review before public commercial launch.</p></section>
          </div>
        </article>
        <footer className="flex flex-wrap items-center justify-between gap-3 py-6 text-xs text-white/45">
          <span>© {new Date().getFullYear()} SAVIS. All rights reserved.</span>
          <Link href="/privacy" className="font-bold text-amber-300">Privacy policy →</Link>
        </footer>
      </div>
    </main>
  );
}
