"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VipPage() {
  const [role, setRole] = useState("provider");
  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setRole(String(data?.role || user.user_metadata?.role || "provider").toLowerCase());
    })();
  }, []);
  return <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white">
    <div className="mx-auto max-w-xl">
      <Link href={role === "consumer" ? "/profile" : "/provider-profile"} className="text-sm font-bold text-white/65">← Back to profile</Link>
      <section className="mt-5 overflow-hidden rounded-3xl border border-amber-200/20 bg-gradient-to-br from-[#28233b] via-[#17253a] to-[#101e2d] p-6">
        <p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">SAVIS membership</p>
        <h1 className="mt-2 text-3xl font-black">VIP & benefits</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">Membership options are not active yet. SAVIS will show the available plans, prices and benefits here when they are ready. No membership purchase or payment is being taken on this page.</p>
        <div className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-4">
          <p className="font-bold text-amber-100">Coming later</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/65">
            <li>Clear plan details and pricing</li>
            <li>Provider visibility and profile benefits, if offered</li>
            <li>Membership status and renewal controls</li>
          </ul>
        </div>
        <Link href="/provider-profile" className="mt-5 block rounded-full bg-white/10 px-4 py-3 text-center text-sm font-bold text-white hover:bg-white/15">Return to provider profile</Link>
      </section>
    </div>
  </main>;
}
