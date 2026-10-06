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
  const [photoOpen, setPhotoOpen] = useState(false);

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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[#B9C3C9]">Loading…</p>
      </main>
    );
  }

  const role = profile?.role || "consumer";
  const name = profile?.full_name || "Friend";
  const initial = name.charAt(0).toUpperCase();

  return (
    <main className="savis-app-shell min-h-screen pb-28">
      <header className="savis-app-header">
        <div className="savis-app-header-inner" style={{ gridTemplateColumns: "auto 1fr" }}>
          <Logo size="sm" />
          <div>
            <div className="text-[0.65rem] font-black tracking-widest text-[#f5c451]">ACCOUNT</div>
            <h1 className="text-lg font-black leading-tight">Profile</h1>
          </div>
        </div>
      </header>

      <div className="savis-app-content max-w-lg mx-auto px-4 pt-4">
        {/* Hero: tap photo to view / edit */}
        <section
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
            padding: "16px",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            aria-label="View or change profile photo"
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              border: "2px solid rgba(255,255,255,0.2)",
              padding: 0,
              background: "linear-gradient(135deg,#E22227,#C7080C)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "1.6rem",
              color: "#fff",
            }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              initial
            )}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="text-[0.65rem] font-black tracking-widest text-[#f5c451]">ACCOUNT</span>
            <h1 className="text-xl font-black truncate">{name}</h1>
            <p className="text-sm text-white/60 truncate">{profile?.email || "Member"}</p>
            <p className="text-xs text-white/40 capitalize mt-0.5">{role}</p>
            {profile?.location_name && (
              <p className="text-xs text-white/45 mt-1">{profile.location_name}</p>
            )}
            <p className="text-[0.65rem] text-white/35 mt-2">Tap photo to view or change</p>
          </div>
        </section>

        <div style={{ display: "grid", gap: 10 }}>
          {[
            ["✏️", "Edit name & details", "Full name, location, bio", "/profile/edit"],
            ["⚙️", "Settings", "Language, notifications, log out", "/settings"],
            ["📋", "Bookings & receipts", "History and reviews", "/bookings"],
          ].map(([icon, title, desc, href]) => (
            <Link
              key={title}
              href={href}
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
      </div>

      {/* Full-screen photo viewer */}
      {photoOpen && (
        <div
          role="dialog"
          aria-label="Profile photo"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setPhotoOpen(false)}
        >
          <div
            style={{
              width: "min(320px, 90vw)",
              height: "min(320px, 90vw)",
              borderRadius: "50%",
              overflow: "hidden",
              background: "linear-gradient(135deg,#E22227,#C7080C)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "4rem",
              fontWeight: 900,
              color: "#fff",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              initial
            )}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setPhotoOpen(false);
                router.replace("/profile/edit");
              }}
              style={{
                padding: "12px 20px",
                borderRadius: 999,
                border: 0,
                background: "linear-gradient(135deg,#E22227,#C7080C)",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Change photo
            </button>
            <button
              type="button"
              onClick={() => setPhotoOpen(false)}
              style={{
                padding: "12px 20px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <SavisBottomNav active="profile" />
    </main>
  );
}
