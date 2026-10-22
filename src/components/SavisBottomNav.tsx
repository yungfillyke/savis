"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "home" | "for-you" | "jobs" | "messages" | "profile";
type Props = { active?: Tab };
type NavRole = "provider" | "professional" | "consumer" | "other";

export default function SavisBottomNav({ active = "profile" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<NavRole>("consumer");

  useEffect(() => {
    let mounted = true;
    async function loadRole() {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      const { data } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const rawRole = String(data?.role || user.user_metadata?.role || "consumer").toLowerCase();
      const nextRole: NavRole =
        ["provider", "professional", "producer", "wholesale_retail"].includes(rawRole) ? "provider" :
        rawRole === "consumer" ? "consumer" : "other";
      if (mounted) setRole(nextRole);
    }
    void loadRole();
    return () => { mounted = false; };
  }, []);

  const provider = role === "provider";
  const tabs: { id: Tab; label: string; icon: string; href: string }[] = [
    { id: "home", label: "Home", icon: "⌂", href: provider ? "/provider" : "/consumer" },
    { id: "for-you", label: provider ? "My Work" : "For You", icon: "✦", href: provider ? "/provider" : "/consumer" },
    { id: "jobs", label: provider ? "Jobs" : "Bookings", icon: "▣", href: provider ? "/provider" : "/bookings" },
    { id: "messages", label: "Messages", icon: "◌", href: "/messages" },
    { id: "profile", label: "Profile", icon: "◉", href: provider ? "/provider-profile" : "/profile" },
  ];

  function go(href: string) {
    if (pathname === href) return;
    router.replace(href);
  }

  return (
    <nav className="savis-bottom-nav" aria-label="Main">
      <div>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.href)}
            className={active === item.id ? "is-active" : ""}
            style={{
              border: 0, cursor: "pointer", display: "flex", flexDirection: "row",
              alignItems: "center", justifyContent: "center", gap: active === item.id ? 8 : 0,
              padding: active === item.id ? "10px 16px" : "10px 12px", borderRadius: 999,
              minWidth: 44, minHeight: 44,
              color: active === item.id ? "#14171a" : "rgba(255,255,255,0.55)",
              background: active === item.id ? "#fff" : "transparent", fontWeight: 800,
            }}
          >
            <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{item.icon}</span>
            {active === item.id && <b style={{ fontSize: "0.72rem", fontWeight: 800 }}>{item.label}</b>}
          </button>
        ))}
      </div>
    </nav>
  );
}
