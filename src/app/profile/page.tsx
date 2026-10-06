"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SavisBottomNav from "@/components/SavisBottomNav";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

type Profile = {
  full_name: string | null;
  role: string | null;
  email: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location_name?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role, email, avatar_url, bio, location_name")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(
        data || {
          full_name: user.user_metadata?.full_name || "Friend",
          role: user.user_metadata?.role || "consumer",
          email: user.email || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        }
      );
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[#B9C3C9]">Loading…</p>
      </main>
    );
  }

  const role = profile?.role || "consumer";

  return (
    <main className="savis-app-shell min-h-screen pb-28">
      <header className="savis-app-header">
        <div className="savis-app-header-inner" style={{ gridTemplateColumns: "auto 1fr auto" }}>
          <Logo size="sm" />
          <div>
            <div className="text-[0.65rem] font-black tracking-widest text-[#f5c451]">ACCOUNT</div>
            <h1 className="text-lg font-black leading-tight">Profile</h1>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-xs font-bold text-white/70 px-3 py-2"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="savis-app-content max-w-lg mx-auto px-4 pt-4">
        <section className="savis-profile-modern" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div
            className="savis-profile-avatar-large"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "1.5rem",
              background: "linear-gradient(135deg,#E22227,#C7080C)",
            }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile?.full_name || "U").charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1 }}>
            <span className="text-[0.65rem] font-black tracking-widest text-[#f5c451]">ACCOUNT</span>
            <h1 className="text-xl font-black">{profile?.full_name || "Your SAVIS profile"}</h1>
            <p className="text-sm text-white/60">
              {profile?.email || "Member"} · {role}
            </p>
            {profile?.location_name && (
              <p className="text-xs text-white/45 mt-1">{profile.location_name}</p>
            )}
          </div>
          <Link href="/profile/edit" className="savis-outline-button" style={{ whiteSpace: "nowrap" }}>
            EDIT
          </Link>
        </section>

        <div className="savis-profile-grid" style={{ display: "grid", gap: 10 }}>
          {[
            ["✏️", "Edit profile & photo", "Name, photo, location", "/profile/edit"],
            ["⚙️", "Settings", "Appearance, language, notifications", "/settings"],
            ["📋", "Bookings & receipts", "History and reviews", "/bookings"],
            ["💳", "Payments", "Wallet and M-Pesa", "/consumer/payments"],
          ].map(([icon, title, desc, href]) => (
            <Link
              key={title}
              href={href}
              className="savis-profile-action"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                textDecoration: "none",
                color: "#fff",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <b style={{ display: "block", fontSize: "0.9rem" }}>{title}</b>
                <small style={{ color: "rgba(255,255,255,0.55)" }}>{desc}</small>
              </div>
              <strong>→</strong>
            </Link>
          ))}
        </div>

        <section
          className="savis-wallet-modern"
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 18,
            border: "1px solid rgba(245,196,81,0.25)",
            background: "rgba(245,196,81,0.06)",
          }}
        >
          <span className="text-[0.65rem] font-black tracking-widest text-[#f5c451]">SAVIS WALLET</span>
          <strong className="block text-base mt-1">Ready for M-Pesa & escrow</strong>
          <p className="text-sm text-white/55 mt-1">
            Payment protection will appear here when live payments go on.
          </p>
        </section>

        <button
          type="button"
          onClick={() => void handleLogout()}
          style={{
            marginTop: 24,
            width: "100%",
            padding: "14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent",
            color: "#ff8a8d",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>

      <SavisBottomNav active="profile" />
    </main>
  );
}
