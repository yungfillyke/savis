"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Section = "overview" | "jobs" | "payments" | "messaging" | "marketplace";

export default function OperationalControlCenter() {
  const supabase = useMemo(() => createClient(), []);
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [section,setSection]=useState<Section>("overview");
  const [overview,setOverview]=useState<any>({});
  const [jobs,setJobs]=useState<any[]>([]);
  const [payments,setPayments]=useState<any[]>([]);
  const [conversations,setConversations]=useState<any[]>([]);
  const [market,setMarket]=useState<any>({});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function load() {
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/login?next=/dev-console-9f3k/operations";return;}
    const {data:ok}=await supabase.rpc("is_developer_admin"); setAllowed(Boolean(ok));
    if(!ok)return;
    const [o,j,p,c,m]=await Promise.all([
      supabase.rpc("developer_operational_overview"),
      supabase.rpc("list_developer_jobs",{p_status:null,p_limit:100}),
      supabase.rpc("list_developer_payments",{p_status:null,p_limit:100}),
      supabase.rpc("list_developer_conversations",{p_limit:100}),
      supabase.rpc("list_developer_marketplace")
    ]);
    setOverview(o.data||{}); setJobs(j.data||[]); setPayments(p.data||[]); setConversations(c.data||[]); setMarket(m.data||{});
    await supabase.rpc("write_developer_audit",{p_action:"developer.operations.open",p_metadata:{path:"/dev-console-9f3k/operations"}});
  }
  useEffect(()=>{void load()},[supabase]);

  async function transition(id:string,next:string){
    setBusy(true); const {error}=await supabase.rpc("developer_transition_job",{p_job_id:id,p_next_status:next,p_note:"Developer operational action"});
    if(error) alert(error.message); else await load(); setBusy(false);
  }
  async function payment(id:string,next:string){
    setBusy(true); const {error}=await supabase.rpc("developer_update_payment_status",{p_payment_id:id,p_status:next});
    if(error) alert(error.message); else await load(); setBusy(false);
  }
  async function sendSupport(id:string){
    if(!message.trim())return; setBusy(true);
    const {error}=await supabase.rpc("developer_send_support_message",{p_conversation_id:id,p_body:message});
    if(error)alert(error.message);else{setMessage("");await load();}
    setBusy(false);
  }

  if(allowed===null)return <main className="min-h-screen grid place-items-center bg-[#07050d] text-white">Checking developer access…</main>;
  if(!allowed)return <main className="min-h-screen grid place-items-center bg-[#07050d] text-white"><div className="rounded-3xl border border-red-400/20 p-8 text-center"><h1 className="text-2xl font-black">Developer access denied</h1><Link href="/" className="mt-4 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-black">Exit</Link></div></main>;

  const tabs:[Section,string][]=[["overview","Overview"],["jobs","Bookings & Jobs"],["payments","Payments"],["messaging","Messaging"],["marketplace","Marketplace"]];
  return <main className="min-h-screen bg-[#07050d] text-white">
    <header className="sticky top-0 z-20 border-b border-violet-400/15 bg-[#0b0714]/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><p className="text-[11px] font-black uppercase tracking-[.25em] text-[#F5C451]">SAVIS Developer • Operational</p><h1 className="text-2xl font-black">Control Center</h1></div><div className="flex gap-2"><Link href="/dev-console-9f3k" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold">Developer Console</Link><Link href="/consumer" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold">Exit</Link></div></div></header>
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap gap-2">{tabs.map(([k,l])=><button key={k} onClick={()=>setSection(k)} className={`rounded-full px-4 py-2 text-sm font-black ${section===k?"bg-amber-300 text-black":"border border-white/10 bg-white/5 text-white/65"}`}>{l}</button>)}</div>

      {section==="overview"&&<><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Jobs",overview.jobs],["Active jobs",overview.active_jobs],["Payments",overview.payments],["Held/pending",overview.held_payments],["Conversations",overview.conversations],["Products",overview.products],["Orders",overview.orders]].map(([l,v])=><div key={String(l)} className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><p className="text-xs uppercase tracking-widest text-white/40">{l}</p><p className="mt-2 text-3xl font-black">{v??0}</p></div>)}</div><div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-400/[.04] p-5 text-sm text-white/65">Operational actions are audited. They do not expose consumer administration, owner passwords, or nuclear controls. Payment status changes are recovery controls, not live Safaricom configuration.</div></>}

      {section==="jobs"&&<div className="space-y-3">{jobs.length===0?<Empty text="No jobs found."/>:jobs.map(j=><div key={j.id} className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-black">{j.provider_name||"Unassigned"} • {j.skill||"Service"}</p><p className="mt-1 text-xs text-white/40">{j.id}</p><p className="mt-2 text-sm text-white/60">{j.description}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{j.status}</span></div><div className="mt-4 flex flex-wrap gap-2">{nextStatuses(j.status).map(s=><button key={s} disabled={busy} onClick={()=>transition(j.id,s)} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-200">Set {s}</button>)}</div></div>)}</div>}

      {section==="payments"&&<div className="space-y-3">{payments.length===0?<Empty text="No payments found."/>:payments.map(p=><div key={p.id} className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-black">KES {p.amount} • {p.method}</p><p className="text-xs text-white/40">{p.id} • {p.created_at}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{p.status}</span></div><div className="mt-4 flex flex-wrap gap-2">{["held","released","refunded","failed","cancelled"].filter(s=>s!==p.status).map(s=><button key={s} disabled={busy} onClick={()=>payment(p.id,s)} className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-black text-violet-200">Set {s}</button>)}</div></div>)}</div>}

      {section==="messaging"&&<div className="space-y-3">{conversations.length===0?<Empty text="No conversations found."/>:conversations.map(c=><div key={c.id} className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><p className="font-black">Conversation {c.id.slice(0,8)}</p><p className="mt-1 text-xs text-white/40">Consumer {c.consumer_id} • Provider {c.provider_id}</p><p className="mt-3 text-sm text-white/60">{c.last_message||"No messages yet."}</p><div className="mt-4 flex gap-2"><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Send support message…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"/><button disabled={busy} onClick={()=>sendSupport(c.id)} className="rounded-xl bg-[#F5C451] px-4 py-2 text-sm font-black text-black">Send</button></div></div>)}</div>}

      {section==="marketplace"&&<div className="grid gap-4 md:grid-cols-3"><div className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><p className="text-xs uppercase tracking-widest text-white/40">Products</p><p className="mt-2 text-3xl font-black">{market.products??0}</p></div><div className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><p className="text-xs uppercase tracking-widest text-white/40">Orders</p><p className="mt-2 text-3xl font-black">{market.orders??0}</p></div><div className="rounded-3xl border border-amber-400/20 bg-amber-400/[.04] p-5"><p className="font-black">Marketplace controls</p><p className="mt-2 text-sm text-white/55">Demo seeding, featured listings and bulk moderation will be added here as separate audited operations.</p></div></div>}
    </div>
  </main>;
}
function nextStatuses(s:string){const m:Record<string,string[]>={
  requested:["quote_pending","accepted","declined","cancelled"],quote_pending:["accepted","declined","cancelled"],accepted:["en_route","cancelled","rescheduled"],en_route:["in_progress","cancelled"],in_progress:["completed","cancelled"],rescheduled:["accepted","cancelled"]};return m[s]||[]}
function Empty({text}:{text:string}){return <div className="rounded-3xl border border-white/10 bg-white/[.035] p-8 text-sm text-white/45">{text}</div>}
