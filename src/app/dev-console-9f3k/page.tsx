"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Mode = "safe" | "operational" | "nuclear";

const safe = [
  ["Overview", "System health, environment, deployment state and recent audit activity."],
  ["Analytics", "Users, providers, bookings, revenue, searches and funnel visibility."],
  ["Provider Review", "Review verification queues and trust signals."],
  ["Search & Location", "Radius tests, category filters and simulated Kenyan locations."],
  ["Feature Flags", "Safely turn product capabilities on or off with an audit trail."],
  ["Logs & Health", "Inspect application health and operational diagnostics."]
];

const operational = [
  ["Business Control Center", "Manage providers, sellers and professional accounts without exposing consumer accounts."],
  ["Assisted Sessions", "Enter an audited developer session for an eligible business account. Never share owner passwords."],
  ["Agent Management", "Developer-only agent accounts, assignments and controls."],
  ["Marketplace", "Demo content, featured services, sponsored placements and provider tooling."],
  ["Bookings & Payments", "Operational inspection and controlled recovery workflows."],
  ["Messaging", "Conversation inspection, support actions and notification testing."]
];

const nuclear = [
  ["Global maintenance", "Place the marketplace into controlled maintenance/read-only mode."],
  ["Signup & payments", "Emergency disable switches for signup or payment entry points."],
  ["Force re-login", "Invalidate application sessions after a confirmed security event."],
  ["Data destruction", "Destructive database operations remain separately authenticated and confirmation-gated."]
];

export default function DeveloperConsole() {
  const supabase = useMemo(() => createClient(), []);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("safe");
  const [developer, setDeveloper] = useState("Developer");
  const [flags, setFlags] = useState<any[]>([]);
  const [flagKey, setFlagKey] = useState("");
  const [flagDescription, setFlagDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [nuclearUnlocked, setNuclearUnlocked] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login?next=/dev-console-9f3k"; return; }
      setDeveloper(user.email || "Developer");
      const { data } = await supabase.rpc("is_developer_admin");
      setAllowed(Boolean(data));
      if (data) {
        const { data: f } = await supabase.rpc("list_developer_feature_flags");
        setFlags(f || []);
        await supabase.rpc("write_developer_audit", { p_action: "developer.console.open", p_metadata: { path: "/dev-console-9f3k" } });
      }
    })();
  }, [supabase]);

  if (allowed === null) return <main className="min-h-screen grid place-items-center bg-[#07050d] text-white">Checking developer access…</main>;
  if (!allowed) return <main className="min-h-screen grid place-items-center bg-[#07050d] text-white"><div className="rounded-3xl border border-red-400/20 bg-white/[.04] p-8 text-center"><h1 className="text-2xl font-black">Developer access denied</h1><p className="mt-2 text-sm text-white/60">This area is allowlist protected.</p><Link href="/" className="mt-5 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-black">Exit</Link></div></main>;

  const cards = mode === "safe" ? safe : mode === "operational" ? operational : nuclear;

  async function toggleFlag(key: string, enabled: boolean, description?: string) {
    setBusy(true);
    const { data } = await supabase.rpc("set_developer_feature_flag", { p_key: key, p_enabled: enabled, p_description: description || null });
    if (data) setFlags(prev => [...prev.filter(x => x.key !== key), data].sort((a,b) => a.key.localeCompare(b.key)));
    setBusy(false);
  }

  async function addFlag() {
    if (!flagKey.trim()) return;
    await toggleFlag(flagKey.trim(), false, flagDescription.trim() || undefined);
    setFlagKey(""); setFlagDescription("");
  }

  return <main className="min-h-screen bg-[#07050d] text-white">
    <header className="sticky top-0 z-20 border-b border-violet-400/15 bg-[#0b0714]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <div><p className="text-[11px] font-black uppercase tracking-[.25em] text-[#F5C451]">SAVIS Developer Control Plane</p><h1 className="text-2xl font-black">Operations Console</h1></div>
        <div className="flex items-center gap-2"><span className="hidden rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-2 text-xs text-violet-200 sm:inline">Signed in: {developer}</span><Link href="/consumer" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold">Exit Developer Mode</Link></div>
      </div>
    </header>

    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[230px_1fr]">
      <aside className="h-fit rounded-3xl border border-violet-400/15 bg-white/[.035] p-3">
        <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[.2em] text-white/40">Control levels</p>
        {(["safe","operational","nuclear"] as Mode[]).map(x => <button key={x} onClick={() => setMode(x)} className={`mb-2 w-full rounded-2xl px-3 py-3 text-left text-sm font-black capitalize ${mode===x ? x==="safe"?"bg-emerald-400/15 text-emerald-300":x==="operational"?"bg-amber-400/15 text-amber-300":"bg-red-500/15 text-red-300":"text-white/60 hover:bg-white/5"}`}>{x==="safe"?"🟢":x==="operational"?"🟠":"🔴"} {x}</button>)}
        <div className="my-4 border-t border-white/10"/>
        <p className="px-3 text-[10px] font-black uppercase tracking-[.2em] text-white/40">Business tools</p>
        {["Providers","Shops & Sellers","Professionals","Agents"].map(x=><button key={x} onClick={()=>setMode("operational")} className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-white/65 hover:bg-white/5">{x}</button>)}
      </aside>

      <section>
        <div className={`rounded-3xl border p-5 ${mode==="safe"?"border-emerald-400/20 bg-emerald-400/[.035]":mode==="operational"?"border-amber-400/20 bg-amber-400/[.035]":"border-red-500/25 bg-red-500/[.035]"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] opacity-60">{mode} control level</p><h2 className="mt-1 text-xl font-black">{mode==="safe"?"Observe & configure":mode==="operational"?"Operate the marketplace":"Emergency controls"}</h2></div>{mode==="nuclear" && <button onClick={()=>setNuclearUnlocked(!nuclearUnlocked)} className="rounded-full bg-red-500 px-4 py-2 text-xs font-black">{nuclearUnlocked?"Lock Nuclear Controls":"Unlock Nuclear Controls"}</button>}</div>
          <p className="mt-2 max-w-3xl text-sm text-white/60">{mode==="nuclear"?"Nuclear actions are intentionally isolated. Production destructive actions require a second authentication step, developer credential and explicit confirmation.": "Developer actions are separate from consumer accounts and are designed around auditability and least privilege."}</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {cards.map(([title,desc]) => <article key={title} className={`rounded-3xl border border-white/10 bg-white/[.035] p-5 ${mode==="nuclear"&&!nuclearUnlocked?"opacity-55":""}`}><div className="flex items-center justify-between gap-3"><h3 className="font-black">{title}</h3><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/45">{mode}</span></div><p className="mt-2 text-sm leading-6 text-white/55">{desc}</p>{mode==="operational"&&<button className="mt-4 rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-xs font-black text-violet-200">Open control center</button>}{mode==="nuclear"&&<button disabled={!nuclearUnlocked} className="mt-4 rounded-full border border-red-400/20 px-4 py-2 text-xs font-black text-red-300 disabled:opacity-30">Second authentication required</button>}</article>)}
        </div>

        {mode==="safe" && <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-black">Feature flags</h2><p className="mt-1 text-sm text-white/50">Safe switches are stored server-side and every change is audited.</p></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={flagKey} onChange={e=>setFlagKey(e.target.value)} placeholder="flag_key" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"/><input value={flagDescription} onChange={e=>setFlagDescription(e.target.value)} placeholder="description" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"/><button disabled={busy} onClick={addFlag} className="rounded-xl bg-[#F5C451] px-4 py-2 text-sm font-black text-black">Add</button></div>
          <div className="mt-4 space-y-2">{flags.length===0?<p className="text-sm text-white/40">No flags yet.</p>:flags.map(f=><div key={f.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/15 p-3"><div><p className="text-sm font-bold">{f.key}</p><p className="text-xs text-white/40">{f.description || "No description"}</p></div><button disabled={busy} onClick={()=>toggleFlag(f.key,!f.enabled,f.description)} className={`rounded-full px-3 py-1.5 text-xs font-black ${f.enabled?"bg-emerald-400/15 text-emerald-300":"bg-white/10 text-white/50"}`}>{f.enabled?"ON":"OFF"}</button></div>)}</div>
        </section>}
      </section>
    </div>
  </main>;
}
