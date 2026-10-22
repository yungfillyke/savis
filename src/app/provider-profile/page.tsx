"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SavisBottomNav from "@/components/SavisBottomNav";

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

export default function ProviderProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase.from("profiles")
        .select("full_name,role,email,avatar_url,bio,location_name,service_category,rating,review_count,verification_status")
        .eq("id", user.id).maybeSingle();
      const role = String(data?.role || user.user_metadata?.role || "provider").toLowerCase();
      if (!["provider","professional","producer","agent","wholesale_retail"].includes(role)) {
        router.replace("/profile");
        return;
      }
      setProfile({
        full_name: data?.full_name || user.user_metadata?.full_name || "Provider",
        role, email: data?.email || user.email || null,
        avatar_url: data?.avatar_url || user.user_metadata?.avatar_url || null,
        bio: data?.bio || null, location_name: data?.location_name || null,
        service_category: data?.service_category || null,
        rating: data?.rating == null ? null : Number(data.rating),
        review_count: data?.review_count == null ? null : Number(data.review_count),
        verification_status: data?.verification_status || null
      });
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <main className="min-h-screen flex items-center justify-center bg-white text-slate-600">Loading profile…</main>;

  return (
    <main className="min-h-screen bg-white pb-28 text-slate-900">
      <header className="border-b border-slate-200 px-4 py-5">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link href="/provider" className="text-sm font-bold text-slate-600">← Provider dashboard</Link>
          <h1 className="font-extrabold">My provider profile</h1>
        </div>
      </header>
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <section className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-2xl font-black">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (profile?.full_name || "P").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-black">{profile?.full_name}</h2>
            <p className="mt-1 text-sm capitalize text-slate-600">{profile?.service_category || profile?.role || "Service provider"}</p>
            <p className="mt-1 text-xs text-slate-500">{profile?.rating != null ? `★ ${profile.rating.toFixed(1)} · ${profile.review_count || 0} reviews` : "Ratings appear after verified customer reviews"}</p>
          </div>
        </section>
        <section className="space-y-3 rounded-3xl border border-slate-200 p-5">
          <h3 className="font-extrabold">Profile details</h3>
          <div><p className="text-xs font-bold uppercase text-slate-500">About</p><p className="mt-1 whitespace-pre-wrap text-sm">{profile?.bio || "Add a short description of your services."}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-500">Service area</p><p className="mt-1 text-sm">{profile?.location_name || "Add your service location."}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-500">Verification</p><p className="mt-1 text-sm capitalize">{(profile?.verification_status || "pending").replaceAll("_"," ")}</p></div>
          <p className="break-all text-sm text-slate-600">{profile?.email}</p>
          <Link href="/profile/edit" className="block rounded-full bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white">Edit profile details</Link>
          <Link href="/provider" className="block rounded-full border border-slate-300 px-4 py-3 text-center text-sm font-bold">Back to provider dashboard</Link>
        </section>
      </div>
      <SavisBottomNav active="profile" />
    </main>
  );
}
