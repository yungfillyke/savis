"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ProviderProfile = {
  full_name: string | null;
  role: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_name: string | null;
  service_category: string | null;
  rating: number | null;
  review_count: number | null;
  verification_status: string | null;
};

const providerRoles = ["provider", "professional", "producer", "agent", "wholesale_retail"];

function MenuRow({ icon, title, description, href, accent = "gold" }: {
  icon: string; title: string; description: string; href: string; accent?: "gold" | "green" | "blue";
}) {
  const tones = {
    gold: "border-amber-300/20 bg-amber-300/[0.06] text-amber-200",
    green: "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200",
    blue: "border-sky-300/20 bg-sky-300/[0.06] text-sky-200",
    red: "border-rose-300/20 bg-rose-300/[0.06] text-rose-200",
  };
  return <Link href={href} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 transition hover:bg-white/[0.07]">
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${tones[accent]}`}>{icon}</span>
    <span className="min-w-0 flex-1"><b className="block text-sm text-white">{title}</b><span className="mt-0.5 block text-xs leading-5 text-white/55">{description}</span></span>
    <span className="text-white/35" aria-hidden="true">→</span>
  </Link>;
}

export default function ProviderProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login?next=/provider-profile"); return; }
      const { data } = await supabase.from("profiles")
        .select("full_name,role,email,avatar_url,bio,location_name,service_category,rating,review_count,verification_status")
        .eq("id", user.id).maybeSingle();
      const role = String(data?.role || user.user_metadata?.role || "provider").toLowerCase();
      if (!providerRoles.includes(role)) { router.replace("/profile"); return; }
      setProfile({
        full_name: data?.full_name || user.user_metadata?.full_name || "Provider",
        role, email: data?.email || user.email || null,
        avatar_url: data?.avatar_url || user.user_metadata?.avatar_url || null,
        bio: data?.bio || null, location_name: data?.location_name || null,
        service_category: data?.service_category || null,
        rating: data?.rating == null ? null : Number(data.rating),
        review_count: data?.review_count == null ? null : Number(data.review_count),
        verification_status: data?.verification_status || "unverified",
      });
      setLoading(false);
    })();
  }, [router]);

  async function signOut() {
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) { setMessage("Could not sign out. Please try again."); return; }
    router.replace("/login");
    router.refresh();
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center bg-[#07111f] text-white/70">Loading provider profile…</main>;

  const name = profile?.full_name || "Provider";
  const verified = profile?.verification_status === "verified";
  return <main className="min-h-screen bg-[#07111f] pb-10 text-white">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#101e2d]/95 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <Link href="/provider" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/85"><span aria-hidden="true">←</span> Provider Dashboard</Link>
        <span className="text-xs font-bold text-white/55">ACCOUNT & SETTINGS</span>
      </div>
    </header>

    <div className="mx-auto max-w-2xl space-y-5 px-4 py-5">
      <section className="overflow-hidden rounded-3xl border border-sky-200/10 bg-gradient-to-br from-[#132b40] via-[#102133] to-[#111923] p-5 shadow-xl shadow-black/20">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-amber-300/35 bg-gradient-to-br from-[#166534] to-[#14532D] text-2xl font-black">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-black uppercase tracking-[.16em] text-amber-300">Provider account</p>
            <h1 className="mt-1 truncate text-xl font-black">{name}</h1>
            <p className="mt-1 text-sm capitalize text-white/60">{profile?.service_category || profile?.role || "Service provider"}</p>
            <p className="mt-1 text-xs text-white/50">{profile?.rating != null ? `★ ${profile.rating.toFixed(1)} · ${profile.review_count || 0} reviews` : "Ratings appear after customer reviews"}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className={`rounded-xl border p-3 ${verified ? "border-emerald-300/25 bg-emerald-300/[0.07]" : "border-amber-300/25 bg-amber-300/[0.07]"}`}>
            <p className="text-[0.65rem] uppercase tracking-wider text-white/50">Identity verification</p>
            <p className={`mt-1 text-sm font-extrabold ${verified ? "text-emerald-200" : "text-amber-200"}`}>{verified ? "Verified ✓" : (profile?.verification_status || "Not submitted").replaceAll("_", " ")}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/10 p-3">
            <p className="text-[0.65rem] uppercase tracking-wider text-white/50">Service area</p>
            <p className="mt-1 truncate text-sm font-bold text-white/85">{profile?.location_name || "Add your service area"}</p>
          </div>
        </div>
        <Link href="/profile/edit" className="mt-4 block rounded-full bg-gradient-to-r from-[#166534] to-[#14532D] px-4 py-3 text-center text-sm font-extrabold text-white shadow-md">Edit profile details</Link>
      </section>

      <section className="space-y-2">
        <div><h2 className="text-sm font-black uppercase tracking-wider text-white/85">Your work & trust</h2><p className="mt-1 text-xs text-white/45">Keep your professional account up to date.</p></div>
        <MenuRow icon="🛡️" title="KYC & verification" description="Submit documents or check your review status" href="/provider/verification" accent="green" />
        <MenuRow icon="🧰" title="Provider dashboard" description="Return to jobs, schedule, earnings and insights" href="/provider" accent="blue" />
        <MenuRow icon="✉️" title="Job messages" description="Open conversations with customers" href="/messages" accent="blue" />
        <MenuRow icon="⭐" title="VIP & membership" description="View current membership information and available benefits" href="/vip" accent="gold" />
      </section>

      <section className="space-y-2">
        <div><h2 className="text-sm font-black uppercase tracking-wider text-white/85">Preferences & account</h2><p className="mt-1 text-xs text-white/45">Manage how SAVIS looks and how your account works.</p></div>
        <MenuRow icon="⚙️" title="Settings & appearance" description="Theme, language, notifications and account preferences" href="/settings" accent="gold" />
        <MenuRow icon="👤" title="Edit personal details" description="Name, profile photo, bio and service area" href="/profile/edit" accent="blue" />
        <MenuRow icon="📋" title="Bookings & job history" description="Review job records, quotes and receipts" href="/bookings" accent="green" />
        <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-2xl border border-sky-300/20 bg-sky-300/[0.05] p-3.5 text-left transition hover:bg-sky-300/[0.09]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-300/[0.06]">↪</span><span className="flex-1"><b className="block text-sm text-white">Sign out</b><span className="mt-0.5 block text-xs text-white/55">Securely end this session on this device</span></span><span className="text-white/35">→</span>
        </button>
        {message && <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm text-amber-200">{message}</p>}
      </section>

      <section className="space-y-2">
        <div><h2 className="text-sm font-black uppercase tracking-wider text-white/85">SAVIS information & policies</h2><p className="mt-1 text-xs text-white/45">Learn about the marketplace and the rules that keep it clear.</p></div>
        <MenuRow icon="ℹ️" title="About SAVIS" description="What SAVIS is and how the marketplace works" href="/about" accent="blue" />
        <MenuRow icon="📜" title="Terms of use" description="Read the current terms for using SAVIS" href="/terms" accent="gold" />
        <MenuRow icon="🔒" title="Privacy policy" description="How account and marketplace information is handled" href="/privacy" accent="green" />
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-xs leading-5 text-white/45">
          <p className="font-bold text-white/70">Copyright</p>
          <p>© {new Date().getFullYear()} SAVIS. All rights reserved.</p>
          <p className="mt-1">SAVIS marketplace · Kenya</p>
        </div>
      </section>
    </div>
  </main>;
}
