"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type DocKey = "idFront" | "idBack" | "selfie" | "certificate";
const labels: Record<DocKey,string> = {
  idFront: "National ID / Passport — front",
  idBack: "National ID / Passport — back",
  selfie: "Live selfie",
  certificate: "Professional certificate (optional)"
};

export default function ProviderVerificationPage() {
  const router = useRouter();
  const [files,setFiles] = useState<Partial<Record<DocKey,File>>>({});
  const [consent,setConsent] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState<string|null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!files.idFront || !files.idBack || !files.selfie || !consent) {
      setMessage("Please provide the required documents and accept the verification consent.");
      return;
    }
    setBusy(true); setMessage(null);
    try {
      const supabase=createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(!user) { router.replace("/login?next=/provider/verification"); return; }

      const upload=async(key:DocKey,file:File)=>{
        if(file.size>8*1024*1024) throw new Error("Each document must be 8 MB or smaller.");
        if(!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type)) throw new Error("Use JPG, PNG, WEBP or PDF documents.");
        const path=`${user.id}/${key}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
        const {error}=await supabase.storage.from("kyc-documents").upload(path,file,{upsert:false,contentType:file.type});
        if(error) throw error;
        return path;
      };

      const [front,back,selfie]=await Promise.all([
        upload("idFront",files.idFront),upload("idBack",files.idBack),upload("selfie",files.selfie)
      ]);
      const certificate=files.certificate ? await upload("certificate",files.certificate) : null;
      const {error}=await supabase.rpc("submit_provider_kyc",{
        p_id_front_path:front,p_id_back_path:back,p_selfie_path:selfie,p_certificate_path:certificate
      });
      if(error) throw error;
      setMessage("KYC submitted. SAVIS will review your documents before your profile can go live.");
      setTimeout(()=>router.replace("/provider"),900);
    } catch(err) {
      setMessage(err instanceof Error ? err.message : "KYC submission failed. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#07111f] text-white px-4 py-8">
    <div className="max-w-2xl mx-auto">
      <Link href="/provider" className="text-sm text-[#B9C3C9]">← Back to Provider Hub</Link>
      <section className="mt-5 rounded-[28px] border border-white/10 bg-[rgba(13,29,48,.82)] p-5 sm:p-7">
        <span className="text-xs font-black tracking-[.16em] uppercase text-[#F5C451]">SAVIS KYC</span>
        <h1 className="mt-2 text-3xl font-black">Ready to provide a service?</h1>
        <p className="mt-3 text-sm leading-6 text-[#B9C3C9]">Before you put yourself out to consumers, SAVIS requires identity verification. This protects customers and helps us build a trusted local marketplace.</p>
        <div className="mt-5 grid gap-3 text-sm text-[#D8E1E6]">
          <div>✓ National ID or passport</div><div>✓ Selfie for identity matching</div><div>✓ Professional certificate where relevant</div><div>✓ Private document storage — your KYC files are not public</div>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {(Object.keys(labels) as DocKey[]).map(key=><label key={key} className="block rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <span className="block text-sm font-bold">{labels[key]}{key!=="certificate" && <b className="text-[#F5C451]"> *</b>}</span>
            <input className="mt-3 block w-full text-xs text-[#B9C3C9]" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setFiles(v=>({...v,[key]:e.target.files?.[0]}))}/>
          </label>)}
          <label className="flex gap-3 items-start text-xs text-[#B9C3C9]">
            <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5"/>
            <span>I consent to SAVIS processing these documents for provider verification and trust & safety review.</span>
          </label>
          {message && <div className="rounded-xl border border-white/10 bg-white/[.04] p-3 text-sm">{message}</div>}
          <button disabled={busy} className="w-full rounded-2xl bg-[#F5C451] px-5 py-3.5 font-black text-[#141B1F] disabled:opacity-50">{busy ? "Submitting securely…" : "Submit KYC for review"}</button>
        </form>
      </section>
    </div>
  </main>;
}
