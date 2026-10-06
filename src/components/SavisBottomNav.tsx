"use client";

import Link from "next/link";

type Tab = "home" | "for-you" | "jobs" | "messages" | "profile";

type Props = {
  active?: Tab;
};

const TABS: { id: Tab; label: string; icon: string; href: string }[] = [
  { id: "home", label: "Home", icon: "⌂", href: "/consumer" },
  { id: "for-you", label: "For You", icon: "✦", href: "/consumer" },
  { id: "jobs", label: "Jobs", icon: "▣", href: "/bookings" },
  { id: "messages", label: "Messages", icon: "◌", href: "/messages" },
  { id: "profile", label: "Profile", icon: "◉", href: "/profile" },
];

/**
 * Matches consumer app shell bottom nav so profile/bookings/settings
 * do not fall back to the old Home / Search / Bookings / Profile bar.
 */
export default function SavisBottomNav({ active = "profile" }: Props) {
  return (
    <nav className="savis-bottom-nav" aria-label="Main">
      <div>
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={active === item.id ? "is-active" : ""}
            style={{
              textDecoration: "none",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: active === item.id ? 8 : 0,
              padding: active === item.id ? "10px 16px" : "10px 12px",
              borderRadius: 999,
              minWidth: 44,
              minHeight: 44,
              color: active === item.id ? "#14171a" : "rgba(255,255,255,0.55)",
              background: active === item.id ? "#fff" : "transparent",
              fontWeight: 800,
            }}
          >
            <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{item.icon}</span>
            {active === item.id && (
              <b style={{ fontSize: "0.72rem", fontWeight: 800 }}>{item.label}</b>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
