"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const routes = [
  { label: "Provider review / KYC", href: "/admin/provider-review", status: "pending", note: "Review interface exists; live workflow needs verification." },
  { label: "Business control centre", href: "/dev-console-9f3k/business", status: "implemented", note: "Provider, professional and seller administration." },
  { label: "Agent management", href: "/dev-console-9f3k/agents", status: "implemented", note: "Agent administration route." },
  { label: "Marketplace operations", href: "/dev-console-9f3k/operations", status: "implemented", note: "Jobs, payments, conversations and operational summaries." },
  { label: "Developer feature flags", href: "#feature-flags", status: "implemented", note: "Feature flag controls and audit trail." },
  { label: "System health & audit", href: "#system-health", status: "implemented", note: "Health snapshot, security state and recent audit events." },
  { label: "Analytics dashboard", href: "/dev-console-9f3k/operations", status: "pending", note: "Detailed analytics view not confirmed as a separate screen." },
  { label: "Search & location diagnostics", href: "/dev-console-9f3k/operations", status: "pending", note: "Dedicated diagnostics screen not confirmed." },
  { label: "Assisted sessions / impersonation", href: "/dev-console-9f3k/business", status: "pending", note: "Not exposed as a standalone navigation destination." },
  { label: "Payments provider configuration", href: "/dev-console-9f3k/operations", status: "pending", note: "Operational records exist; live gateway configuration is not confirmed." },
];

const navGroups = [
  { title: "Overview", items: [{ label: "System health", href: "#system-health" }, { label: "Architecture map", href: "#architecture" }] },
  { title: "People & businesses", items: [{ label: "Provider review / KYC", href: "/admin/provider-review" }, { label: "Business control centre", href: "/dev-console-9f3k/business" }, { label: "Agent management", href: "/dev-console-9f3k/agents" }] },
  { title: "Marketplace", items: [{ label: "Jobs, bookings & payments", href: "/dev-console-9f3k/operations" }, { label: "Messaging & orders", href: "/dev-console-9f3k/operations" }] },
  { title: "Platform", items: [{ label: "Feature flags", href: "#feature-flags" }, { label: "Audit trail", href: "#audit-trail" }] },
];

export default function DeveloperConsole() {
  const db = useMemo(() => createClient(), []);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("Developer");
  const [flags, setFlags] = useState<any[]>([]);
  const [key, setKey] = useState("");
  const [desc, setDesc] = useState("");
  const [state, setState] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const [{ data: f }, { data: s }, { data: h }, { data: a }] = await Promise.all([
      db.rpc("list_developer_feature_flags"),
      db.rpc("developer_security_snapshot"),
      db.rpc("developer_health_snapshot"),
      db.rpc("list_developer_audit", { p_limit: 40 }),
    ]);
    setFlags(f || []);
    setState(s || null);
    setHealth(h || null);
    setAudit(a || []);
  }

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) { location.href = "/dev-login?next=/dev-console-9f3k"; return; }
      setEmail(user.email || "Developer");
      const { data } = await db.rpc("is_developer_admin");
      setAllowed(Boolean(data));
      if (data) {
        await db.rpc("write_developer_audit", { p_action: "developer.console.open", p_metadata: { path: "/dev-console-9f3k" } });
        await load();
      }
    })();
  }, [db]);

  async function flag(k: string, on: boolean, d?: string) {
    setBusy(true);
    const { data, error } = await db.rpc("set_developer_feature_flag", { p_key: k, p_enabled: on, p_description: d || null });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setFlags(x => [...x.filter(f => f.key !== k), data].sort((a, b) => a.key.localeCompare(b.key)));
    setMessage("Feature flag saved.");
  }

  if (allowed === null) return <main className="min-h-screen grid place-items-center bg-[#07050d] text-white">Checking developer access…</main>;
  if (!allowed) return <main className="min-h-screen grid place-items-center bg-[#07050d] text-white"><div className="max-w-lg rounded-3xl border border-amber-400/20 bg-white/[.04] p-8 text-center"><p className="text-[11px] font-black uppercase tracking-[.25em] text-[#F5C451]">SAVIS Developer Control Plane</p><h1 className="mt-2 text-2xl font-black">Developer access is not provisioned</h1><p className="mt-3 text-sm leading-6 text-white/60">This console is allowlist protected. Set the server-only SAVIS_DEVELOPER_EMAIL to the owner login and keep the Supabase service-role key server-side.</p><Link href="/consumer" className="mt-4 block text-xs text-white/40">Exit</Link></div></main>;

  return <main className="min-h-screen bg-[#07050d] pb-28 text-white">
    <header className="sticky top-0 z-30 border-b border-violet-400/15 bg-[#0b0714]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><div><p className="text-[11px] font-black uppercase tracking-[.25em] text-[#F5C451]">SAVIS Internal • Control Plane</p><h1 className="text-2xl font-black">Developer Console</h1></div><div className="flex items-center gap-2"><span className="hidden rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-xs text-violet-200 sm:inline">{email}</span><Link href="/consumer" className="rounded-full border border-white/15 px-4 py-2 text-xs font-black">Exit</Link></div></div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[250px_1fr]">
      <aside className="h-fit rounded-3xl border border-violet-400/15 bg-white/[.035] p-3">
        <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[.2em] text-white/40">Navigation</p>
        {navGroups.map(group => <div key={group.title} className="mb-4"><p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-violet-200/65">{group.title}</p>{group.items.map(item => <Link key={item.label} href={item.href} className="block rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/[.07] hover:text-white">{item.label}</Link>)}</div>)}
      </aside>
      <div className="min-w-0 space-y-5">
        <section className="rounded-3xl border border-violet-400/20 bg-violet-400/[.04] p-5"><p className="text-xs font-black uppercase tracking-widest text-violet-200/70">Control centre</p><h2 className="mt-1 text-xl font-black">SAVIS at a glance</h2><p className="mt-2 text-sm text-white/55">Use the navigation to reach existing tools. The architecture map below separates confirmed screens from functions that still need implementation or verification.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#202a32] px-3 py-1.5 text-xs text-white">● Implemented / route exists</span><span className="rounded-full bg-[#8b929a]/15 px-3 py-1.5 text-xs text-[#aeb4bb]">● Pending / verify</span></div></section>
        <section id="system-health" className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[.035] p-5"><h2 className="font-black">System health</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{health && Object.entries(health).map(([k,v]) => <div key={k} className="rounded-2xl border border-white/8 bg-black/20 p-3"><p className="text-[10px] uppercase text-white/35">{k.replaceAll("_"," ")}</p><p className="mt-1 text-lg font-black">{String(v)}</p></div>)}</div><div className="mt-4 text-xs text-white/45">Maintenance: {state?.maintenance_mode ? "ON" : "OFF"} · Signup: {state?.signup_enabled ? "ON" : "OFF"} · Payments: {state?.payments_enabled ? "ON" : "OFF"} · Session epoch: {state?.session_epoch ?? "—"}</div></section>
        <section id="architecture" className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[.035] p-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-black">SAVIS architecture tree</h2><p className="mt-1 text-sm text-white/50">A route/function map of what is present versus what needs work.</p></div><span className="text-xs text-white/40">{routes.filter(x=>x.status==="implemented").length} present · {routes.filter(x=>x.status==="pending").length} pending / verify</span></div>
          <div className="mt-5 overflow-x-auto pb-2"><div className="min-w-[540px]">
            <div className="mx-auto w-fit rounded-2xl border border-violet-300/30 bg-[#20202b] px-5 py-3 text-center"><p className="text-xs font-black uppercase tracking-widest text-violet-200">SAVIS platform</p><p className="mt-1 text-sm font-bold">Developer control plane</p></div>
            <div className="mx-auto h-7 w-px bg-violet-300/35"/>
            <div className="grid grid-cols-4 gap-3">{[
              {title:"People & trust",items:routes.slice(0,3)},
              {title:"Marketplace",items:[routes[3],routes[6],routes[9]]},
              {title:"Platform tools",items:[routes[4],routes[5],routes[7]]},
              {title:"Access & support",items:[routes[8]]},
            ].map(group=><div key={group.title} className="relative border-t border-violet-300/25 pt-3"><div className="mb-2 text-center text-[11px] font-black text-white/65">{group.title}</div><div className="space-y-2">{group.items.map(item=><Link key={item.label} href={item.href} className={"block rounded-xl border p-3 transition hover:brightness-125 "+(item.status==="implemented"?"border-[#35434d] bg-[#202a32] text-white":"border-[#777e86]/20 bg-[#8b929a]/10 text-[#aeb4bb]")}><div className="flex items-start gap-2"><span className={"mt-0.5 text-[10px] "+(item.status==="implemented"?"text-[#c5d0d8]":"text-[#969da5]")}>{item.status==="implemented"?"●":"○"}</span><span className="text-xs font-bold">{item.label}</span></div><p className="mt-1 pl-4 text-[10px] leading-4 opacity-60">{item.note}</p></Link>)}</div></div>)}</div>
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-white/40"><span className="h-px w-8 bg-violet-300/30"/>Connections indicate navigation / functional grouping, not proof that every data integration has been end-to-end tested.<span className="h-px w-8 bg-violet-300/30"/></div>
          </div></div>
        </section>
        <section id="feature-flags" className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[.035] p-5"><h2 className="font-black">Feature flags</h2><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={key} onChange={e=>setKey(e.target.value)} placeholder="flag_key" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"/><input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="description" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"/><button disabled={busy||!key.trim()} onClick={()=>{const k=key.trim(),d=desc.trim();setKey("");setDesc("");void flag(k,false,d)}} className="rounded-xl bg-[#F5C451] px-4 py-2 text-sm font-black text-black disabled:opacity-40">Add</button></div><div className="mt-3 space-y-2">{flags.map(f=><div key={f.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 p-3"><div><p className="text-sm font-bold">{f.key}</p><p className="text-xs text-white/40">{f.description||"No description"}</p></div><button disabled={busy} onClick={()=>void flag(f.key,!f.enabled,f.description)} className={"rounded-full px-3 py-1.5 text-xs font-black "+(f.enabled?"bg-[#202a32] text-white":"bg-white/10 text-white/50")}>{f.enabled?"ON":"OFF"}</button></div>)}</div></section>
        <section id="audit-trail" className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[.035] p-5"><h2 className="font-black">Audit trail</h2><div className="mt-3 max-h-72 space-y-2 overflow-auto">{audit.length===0?<p className="text-sm text-white/40">No audit entries returned.</p>:audit.map(x=><div key={x.id} className="flex flex-wrap justify-between gap-3 rounded-xl border border-white/8 p-3 text-xs"><span className="font-bold">{x.action}</span><span className="text-white/35">{new Date(x.created_at).toLocaleString()}</span></div>)}</div></section>
        <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5"><h2 className="font-black">Quick links</h2><div className="mt-3 flex flex-wrap gap-2">{[{label:"Business control",href:"/dev-console-9f3k/business"},{label:"Agent management",href:"/dev-console-9f3k/agents"},{label:"Marketplace operations",href:"/dev-console-9f3k/operations"},{label:"Provider review / KYC",href:"/admin/provider-review"}].map(x=><Link key={x.label} href={x.href} className="rounded-full border border-white/15 bg-[#202a32] px-4 py-2 text-xs font-bold text-white/85">{x.label} ↗</Link>)}</div></section>
      </div>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0714]/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur"><div className="mx-auto flex max-w-3xl justify-around gap-1">{[{label:"Overview",href:"#system-health"},{label:"Tree",href:"#architecture"},{label:"People",href:"/dev-console-9f3k/business"},{label:"Marketplace",href:"/dev-console-9f3k/operations"},{label:"Flags",href:"#feature-flags"},{label:"Audit",href:"#audit-trail"}].map(x=><Link key={x.label} href={x.href} className="rounded-xl px-2 py-2 text-center text-[10px] font-black text-white/65 hover:bg-white/10 hover:text-white sm:px-4 sm:text-xs">{x.label}</Link>)}</div></nav>
    {message && <div className="fixed right-4 top-20 z-50 max-w-sm rounded-xl border border-white/10 bg-[#202a32] px-4 py-3 text-sm shadow-xl">{message}</div>}
  </main>;
}
