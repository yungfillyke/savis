"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SavisBottomNav from "@/components/SavisBottomNav";
import { getLang, setLang, type Lang } from "@/lib/i18n";

type SettingsState = {
  darkMode: boolean;
  notifications: boolean;
  location: boolean;
  emailAlerts: boolean;
  jobUpdates: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsState>({
    darkMode: true,
    notifications: true,
    location: true,
    emailAlerts: true,
    jobUpdates: true,
  });
  const [lang, setLangState] = useState<Lang>("en");
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setLangState(getLang());
    const stored = localStorage.getItem("savis_settings");
    if (stored) {
      try {
        setSettings((current) => ({ ...current, ...JSON.parse(stored) }));
      } catch {
        /* ignore */
      }
    }
  }, []);

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem("savis_settings", JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function changeLanguage(next: Lang) {
    setLang(next);
    setLangState(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="savis-app-shell min-h-screen pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[rgba(34,43,49,0.86)] px-4 py-3 backdrop-blur-md">
        <button type="button" onClick={() => router.replace("/profile")} className="text-sm font-bold text-[#B9C3C9]">
          ← Profile
        </button>
        <h1 className="font-extrabold">Settings</h1>
        <span className="w-12" />
      </header>

      <div className="mx-auto max-w-lg px-4 pt-6">
        {saved && (
          <div className="mb-4 rounded-xl border border-[#34D399]/20 bg-[#34D399]/10 px-4 py-3 text-xs font-bold text-[#86efac]">
            Settings saved
          </div>
        )}

        <section className="mb-5">
          <h2 className="mb-2 px-1 text-xs font-extrabold uppercase tracking-wider text-[#B9C3C9]">Account</h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <button type="button" onClick={() => router.replace("/profile/edit")} className="flex w-full items-center justify-between border-b border-white/10 px-4 py-4 text-left text-sm font-bold">
              Edit profile & photo <span className="text-white/40">→</span>
            </button>
            <button type="button" onClick={() => router.replace("/profile")} className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-bold">
              View profile <span className="text-white/40">→</span>
            </button>
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-2 px-1 text-xs font-extrabold uppercase tracking-wider text-[#B9C3C9]">Language</h2>
          <div className="flex gap-2">
            {(["en", "sw"] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => changeLanguage(code)}
                className={`flex-1 rounded-2xl border py-3 text-sm font-bold ${
                  lang === code ? "border-[#E22227] bg-[#E22227]/20 text-white" : "border-white/10 bg-white/5 text-white/70"
                }`}
              >
                {code === "en" ? "English" : "Kiswahili"}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-2 px-1 text-xs font-extrabold uppercase tracking-wider text-[#B9C3C9]">Preferences</h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {(
              [
                ["darkMode", "Dark mode"],
                ["notifications", "Push notifications"],
                ["emailAlerts", "Email alerts"],
                ["jobUpdates", "Job status updates"],
                ["location", "Use my location"],
              ] as const
            ).map(([key, label], i, arr) => (
              <div key={key} className={`flex items-center justify-between px-4 py-4 ${i < arr.length - 1 ? "border-b border-white/10" : ""}`}>
                <span className="text-sm font-bold">{label}</span>
                <button
                  type="button"
                  onClick={() => update(key, !settings[key])}
                  className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${settings[key] ? "bg-[#E22227]" : "bg-white/20"}`}
                >
                  <span className={`block h-5 w-5 rounded-full bg-white transition ${settings[key] ? "translate-x-5" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-2 px-1 text-xs font-extrabold uppercase tracking-wider text-[#B9C3C9]">Support</h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <Link href="/terms" className="flex items-center justify-between border-b border-white/10 px-4 py-4 text-sm font-bold">
              Terms of use <span className="text-white/40">→</span>
            </Link>
            <Link href="/privacy" className="flex items-center justify-between px-4 py-4 text-sm font-bold">
              Privacy policy <span className="text-white/40">→</span>
            </Link>
          </div>
        </section>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="mb-8 w-full rounded-full border border-[#ff8a8d]/40 py-3.5 text-sm font-black text-[#ff8a8d] disabled:opacity-50"
        >
          {loggingOut ? "Signing out…" : "Log out"}
        </button>

        <p className="pb-4 text-center text-[0.65rem] text-white/35">SAVIS · Preferences save on this device</p>
      </div>

      <SavisBottomNav active="profile" />
    </main>
  );
}
