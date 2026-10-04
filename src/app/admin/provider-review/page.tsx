"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Row = {
  provider_id:string; full_name:string|null; service_category:string|null; location_name:string|null;
  verification_status:string|null; kyc_status:string; id_front_path:string; id_back_path:string;
  selfie_path:string; certificate_path:string|null; rejection_reason:string|null;
  submitted_at:string|null; reviewed_at:string|null;
};

export default function ProviderReviewPage(){
  const router=useRouter();
  const [rows,setRows]=useState<Row[]>([]);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [urls,setUrls]=useState<Record<string,string>>({});
  const [reason,setReason]=useState<Record<string,string>>({});

  async function load(){
    const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.replace("/login?next=/admin/provider-review");return;}
    const {data,error}=await supabase.rpc("list_provider_kyc_queue",{p_status:"submitted"});
    if(error){setMessage(error.message);return;}
    setRows((data||[]) as Row[]);
  }
  useEffect(()=>{void load()},[]);

  async function openDoc(path:string){
    const key=path;
    if(urls[key]){window.open(urls[key],"_blank","noopener,noreferrer");return;}
    const supabase=createClient();
    const {data,error}=await supabase.storage.from("kyc-documents").createSignedUrl(path,300);
    if(error){setMessage(error.message);return;}
    setUrls(v=>({...v,[key]:data.signedUrl}));
    window.open(data.signedUrl,"_blank","noopener,noreferrer");
  }

  async function decide(row:Row,decision:"verified"|"rejected"){
    if(decision==="rejected" && !reason[row.provider_id]?.trim()){
      setMessage("Add a rejection reason before rejecting a provider.");
      return;
    }
    setBusy(row.provider_id);setMessage("");
    const supabase=createClient();
    const {error}=await supabase.rpc("review_provider_kyc",{
      p_provider_id:row.provider_id,p_decision:decision,p_rejection_reason:reason[row.provider_id]||null
    });
    if(error){setMessage(error.message);setBusy(null);return;}
    setRows(v=>v.filter(x=>x.provider_id!==row.provider_id));
    setBusy(null);
  }

  return <main className="min-h-screen bg-[#07111f] text-white px-4 py-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/provider" className="text-sm text-[#B9C3C9]">← Provider Hub</Link>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#F5C451]">Trust & Safety</p><h1 className="mt-1 text-3xl font-black">Provider KYC review</h1><p className="mt-2 text-sm text-[#B9C3C9]">Review submitted identity documents before providers become visible to consumers.</p></div>
        <button onClick={()=>void load()} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold">Refresh</button>
      </div>
      {message && <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">{message}</div>}
      <div className="mt-6 grid gap-4">
        {rows.length===0 && <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-[#B9C3C9]">No submitted providers are waiting for review.</div>}
        {rows.map(row=><article key={row.provider_id} className="rounded-3xl border border-white/10 bg-white/[.04] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-black">{row.full_name||"Provider"}</h2><p className="text-xs text-[#B9C3C9]">{row.service_category||"Service"} · {row.location_name||"Location not set"}</p></div>
            <span className="rounded-full border border-[#F5C451]/30 bg-[#F5C451]/10 px-3 py-1 text-xs font-bold text-[#F5C451]">Submitted</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {[["ID front",row.id_front_path],["ID back",row.id_back_path],["Selfie",row.selfie_path],["Certificate",row.certificate_path]].map(([label,path])=><button key={label} disabled={!path} onClick={()=>path&&void openDoc(path)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left text-xs font-bold disabled:opacity-30">{label}<span className="mt-1 block text-[#B9C3C9]">{path?"Open securely":"Not provided"}</span></button>)}
          </div>
          <textarea value={reason[row.provider_id]||""} onChange={e=>setReason(v=>({...v,[row.provider_id]:e.target.value}))} placeholder="Rejection reason (required only when rejecting)" className="mt-4 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none"/>
          <div className="mt-4 flex gap-2">
            <button disabled={!!busy} onClick={()=>void decide(row,"verified")} className="rounded-xl bg-[#34D399] px-4 py-2.5 text-sm font-black text-[#07111f] disabled:opacity-50">{busy===row.provider_id?"Saving…":"Approve & verify"}</button>
            <button disabled={!!busy} onClick={()=>void decide(row,"rejected")} className="rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 px-4 py-2.5 text-sm font-black text-[#FB7185] disabled:opacity-50">Reject</button>
          </div>
        </article>)}
      </div>
    </div>
  </main>;
}
