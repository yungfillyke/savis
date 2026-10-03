"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

const categories = [
  ["🔧", "Plumbing"],
  ["⚡", "Electrical"],
  ["🧹", "Cleaning"],
  ["🪚", "Carpentry"],
  ["🧵", "Tailoring"],
  ["🎨", "Painting"],
];

const providers = [
  { icon: "🔧", name: "James Otieno", skill: "Plumbing", area: "Westlands", rating: "4.9", km: "1.2" },
  { icon: "✂️", name: "Grace Wanjiku", skill: "Tailoring", area: "Parklands", rating: "5.0", km: "0.8" },
  { icon: "⚡", name: "Brian Mutua", skill: "Electrical", area: "Ruaka", rating: "4.8", km: "3.1" },
];

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/consumer");
    };
    void checkSession();
  }, [router]);

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(34,43,49,0.88)] px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Link href="/" aria-label="SAVIS home"><Logo /></Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-[#B9C3C9]">Log in</Link>
            <Link href="/signup?role=consumer" className="rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] px-4 py-2 text-sm font-bold text-white">Get started</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-5">
        <section className="mb-5 rounded-[24px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full border border-[#F5C451]/30 bg-[#F5C451]/10 px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wider text-[#F5C451]">Trusted local help</span>
            <span className="text-xs text-[#B9C3C9]">Kenya</span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight">Find trusted help near you.</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#B9C3C9]">Discover local providers, professionals and shops — then connect, book and manage your service in one place.</p>

          <div className="mt-5 flex gap-2 rounded-full bg-white p-1.5 shadow-xl">
            <input className="min-w-0 flex-1 rounded-full px-4 py-3 text-[0.95rem] text-[#222B31] outline-none" placeholder="What do you need help with?" />
            <Link href="/signup?role=consumer" className="whitespace-nowrap rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] px-5 py-3 text-sm font-bold text-white">Search</Link>
          </div>
          <div className="mt-3 flex items-center gap-2 px-1 text-sm text-[#B9C3C9]"><span>📍</span><span>Nairobi</span><span className="text-[#55666E]">•</span><span>Use your location after signing in</span></div>
        </section>

        <section className="mb-5 overflow-hidden rounded-[20px] border border-[rgba(245,196,81,0.28)] bg-gradient-to-br from-[rgba(108,1,2,0.92)] to-[rgba(34,43,49,0.92)] p-5">
          <div className="mb-2 flex items-center justify-between"><span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wider text-[#F5C451]">Sponsored</span><span className="text-xs text-[#B9C3C9]">Local business</span></div>
          <h2 className="text-lg font-extrabold">Reach more customers with SAVIS</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#e6d9da]">Promote a trusted local service or shop to people searching nearby.</p>
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold">Categories</h2><span className="text-xs text-[#B9C3C9]">Popular services</span></div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(([icon, name]) => (
              <Link key={name} href={"/signup?role=consumer"} className="flex min-w-[82px] shrink-0 flex-col items-center gap-1 rounded-2xl border border-white/10 bg-[rgba(34,43,49,0.72)] px-3 py-2.5 text-xs font-bold text-[#B9C3C9]">
                <span className="text-lg">{icon}</span><span>{name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-6 overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
          <div className="flex items-center justify-between px-4 pt-4"><div><h2 className="text-lg font-extrabold">People near you</h2><p className="mt-0.5 text-xs text-[#B9C3C9]">Example SAVIS providers</p></div><Link href="/signup?role=consumer" className="text-xs font-bold text-[#F5C451]">See all →</Link></div>
          <div className="space-y-3 p-4">
            {providers.map((p) => (
              <div key={p.name} className="rounded-[18px] border border-white/10 bg-black/10 p-3.5">
                <div className="flex gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#6C0102] to-[#C7080C] text-xl">{p.icon}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="font-bold">{p.name}</span><span className="text-xs font-bold text-[#34D399]">Verified</span></div><p className="text-xs text-[#B9C3C9]">{p.skill} · {p.km} km · {p.area}</p><p className="mt-1 text-sm font-bold">★ {p.rating}</p></div></div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-5 text-center">
          <h2 className="text-xl font-extrabold">Ready to find help?</h2>
          <p className="mt-1 text-sm text-[#B9C3C9]">Create your SAVIS account and start discovering trusted people nearby.</p>
          <Link href="/signup?role=consumer" className="mt-4 inline-flex rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] px-6 py-3 text-sm font-bold text-white">Create my SAVIS account</Link>
        </section>
      </div>
    </main>
  );
}
