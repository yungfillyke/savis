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

const providerRoles = ["provider", "professional", "producer", "agent", "wholesale_retail"];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsState>({
    darkMode: false,
    notifications: false,
    location: false,
    emailAlerts: true,
    jobUpdates: true,
  });
  const [lang, setLangState] = useState<Lang>("en");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [isProvider, setIsProvider] = useState(false);
  const [ready, setReady] = useState(false);\n  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    setLangState(getLang());
    void (async () => {
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
          const role = String(data?.role || user.user_metadata?.role || "consumer").toLowerCase();
          setIsProvider(providerRoles.includes(role));
        }
      } finally {
        setRoleChecked(true);
      }
    })();
    try {
      const stored = localStorage.getItem("savis_settings");
      if (stored) setSettings((current) => ({ ...current, ...JSON.parse(stored) }));
    } catch { /* ignore unavailable or malformed preferences */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.savisTheme = settings.darkMode ? "dark" : "light";
    window.dispatchEvent(new Event("savis-theme-changed"));
    try { localStorage.setItem("savis_settings", JSON.stringify(settings)); } catch { /* storage may be unavailable */ }
  }, [settings, ready]);

  function showNotice(message: string) {
    setNotice(message);
    setSaved(false);
  }

  async function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    if (key === "notifications" && value) {
      if (typeof window === "undefined" || !("Notification" in window)) {
        showNotice("This browser does not support notification permissions. Email alerts remain available as a preference.");
        return;
      }
      if (Notification.permission === "denied") {
        showNotice("Notifications are blocked by your browser. Change SAVIS permissions in your browser settings.");
        return;
      }
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          showNotice("Notification permission was not granted, so this setting remains off.");
          return;
        }
      }
      showNotice("Browser permission is enabled. SAVIS still needs a push-delivery service to send background notifications.");
    } else if (key === "location" && value) {
      if (!("geolocation" in navigator)) {
        showNotice("Location is not supported by this browser.");
        return;
      }
      const granted = await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
      });
      if (!granted) {
        showNotice("Location access was not granted. You can still enter your service area manually.");
        return;
      }
      showNotice("Location access confirmed for this device. SAVIS only uses it on features that request your location.");
    }
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(true);
    setNotice("");
  }

  function changeLanguage(next: Lang) {
    setLang(next);
    setLangState(next);
    setSaved(true);
    setNotice("");
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLoggingOut(false);
      showNotice("Could not sign out. Please try again.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  if (!roleChecked || !ready) return <main className="min-h-screen flex items-center justify-center bg-[#eaf1fb] text-[#17283d]"><p className="text-sm font-semibold">Loading your settings…</p></main>;\n\n  const backHref = isProvider ? "/provider-profile" : "/profile";
  const pageTone = isProvider
    ? (settings.darkMode ? "bg-[#07111f] text-white" : "bg-[#e9eef3] text-[#17202a]")
    : "savis-app-shell text-white";

  return (
    <main className={`min-h-screen pb-10 ${pageTone}`}>
      <header className={`sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur-xl ${isProvider ? (settings.darkMode ? "border-white/10 bg-[#101e2d]/95 text-white" : "border-slate-200 bg-[#101e2d] text-white") : "border-white/10 bg-[rgba(34,43,49,0.86)] text-white"}`}>
        <button type="button" onClick={() => router.replace(backHref)} className="text-sm font-bold text-white/80">
          ← {isProvider ? "Provider Profile" : "Profile"}
        </button>
        <h1 className="font-extrabold">Settings</h1>
        <span className="w-12" />
      </header>

      <div className="mx-auto max-w-lg px-4 pt-6">
        {(saved || notice) && (
          <div role="status" className={`mb-4 rounded-xl border px-4 py-3 text-xs font-bold ${notice ? "border-amber-500/30 bg-amber-500/10 text-amber-700" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"}`}>
            {notice || "Settings saved on this device"}
          </div>
        )}

        <section className="mb-5">
          <h2 className={`mb-2 px-1 text-xs font-extrabold uppercase tracking-wider ${isProvider && !settings.darkMode ? "text-slate-500" : "text-white/60"}`}>Account</h2>
          <div className={`overflow-hidden rounded-2xl border ${isProvider && !settings.darkMode ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-white/5"}`}>
            <button type="button" onClick={() => router.push("/profile/edit")} className="flex w-full items-center justify-between border-b border-current/10 px-4 py-4 text-left text-sm font-bold">
              Edit profile & photo <span className="opacity-40">→</span>
            </button>
            <button type="button" onClick={() => router.push(backHref)} className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-bold">
              View profile <span className="opacity-40">→</span>
            </button>
          </div>
        </section>

        <section className="mb-5">
          <h2 className={`mb-2 px-1 text-xs font-extrabold uppercase tracking-wider ${isProvider && !settings.darkMode ? "text-slate-500" : "text-white/60"}`}>Language</h2>
          <div className="flex gap-2">
            {(["en", "sw"] as Lang[]).map((code) => (
              <button key={code} type="button" onClick={() => changeLanguage(code)}
                className={`flex-1 rounded-2xl border py-3 text-sm font-bold ${lang === code ? (isProvider ? "border-sky-500 bg-sky-500/10 text-sky-700" : "border-[#E22227] bg-[#E22227]/15 text-[#E22227]") : isProvider && !settings.darkMode ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-white/5 text-white/70"}`}>
                {code === "en" ? "English" : "Kiswahili"}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h2 className={`mb-2 px-1 text-xs font-extrabold uppercase tracking-wider ${isProvider && !settings.darkMode ? "text-slate-500" : "text-white/60"}`}>Appearance & preferences</h2>
          <div className={`overflow-hidden rounded-2xl border ${isProvider && !settings.darkMode ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-white/5"}`}>
            {([
              ["darkMode", "Dark mode", "Use SAVIS's darker provider workspace"],
              ["notifications", "Browser notifications", "Permission only; background push delivery is not yet connected"],
              ["emailAlerts", "Email alerts", "Saved preference; email delivery is not yet connected"],
              ["jobUpdates", "Job status updates", "Saved preference; live alert delivery is not yet connected"],
              ["location", "Allow location access", "Checks browser permission when enabled"],
            ] as const).map(([key, label, description], i, arr) => (
              <div key={key} className={`flex items-center gap-4 px-4 py-4 ${i < arr.length - 1 ? "border-b border-current/10" : ""}`}>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="mt-1 block text-xs leading-5 opacity-60">{description}</span>
                </div>
                <button type="button" role="switch" aria-checked={settings[key]} aria-label={label}
                  onClick={() => void update(key, !settings[key])}
                  className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${settings[key] ? (isProvider ? "bg-sky-600" : "bg-[#E22227]") : "bg-slate-400/50"}`}>
                  <span className={`block h-5 w-5 rounded-full bg-white transition ${settings[key] ? "translate-x-5" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h2 className={`mb-2 px-1 text-xs font-extrabold uppercase tracking-wider ${isProvider && !settings.darkMode ? "text-slate-500" : "text-white/60"}`}>Support</h2>
          <div className={`overflow-hidden rounded-2xl border ${isProvider && !settings.darkMode ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-white/5"}`}>
            <Link href="/terms" className="flex items-center justify-between border-b border-current/10 px-4 py-4 text-sm font-bold">Terms of use <span className="opacity-40">→</span></Link>
            <Link href="/privacy" className="flex items-center justify-between px-4 py-4 text-sm font-bold">Privacy policy <span className="opacity-40">→</span></Link>
          </div>
        </section>

        <button type="button" onClick={() => void handleLogout()} disabled={loggingOut}
          className={`mb-8 w-full rounded-full border py-3.5 text-sm font-black disabled:opacity-50 ${isProvider ? "border-slate-300 text-slate-600" : "border-[#ff8a8d]/40 text-[#ff8a8d]"}`}>
          {loggingOut ? "Signing out…" : "Log out"}
        </button>
        <p className="pb-4 text-center text-[0.65rem] opacity-50">SAVIS · Preferences save on this device</p>
      </div>
      {!isProvider && <SavisBottomNav active="profile" />}
    </main>
  );
}
