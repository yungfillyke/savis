"use client";

import { useEffect, useState } from "react";

const steps=[
  {title:"Find trusted local help",body:"Search services, choose a category and set how far you want SAVIS to look.",target:"savis-search"},
  {title:"See providers on the map",body:"Open the live map to compare nearby verified providers and tap a pin for quick details.",target:"savis-map"},
  {title:"Request and protect a job",body:"Request a service, receive a structured quote, then use Accept & Lock Job to create the protected job record.",target:"savis-jobs"},
  {title:"Keep everything together",body:"Messages, job progress and payment updates stay inside SAVIS.",target:"savis-messages"},
];

export default function SavisOnboarding({open,onClose}:{open:boolean;onClose:()=>void}){
  const [step,setStep]=useState(0);
  useEffect(()=>{if(open)setStep(0)},[open]);
  if(!open)return null;
  const current=steps[step];
  return <div className="fixed inset-0 z-[100] bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="SAVIS tutorial">
    <div className="mx-auto flex min-h-full max-w-md items-center">
      <section className="w-full rounded-[28px] border border-white/15 bg-[#11171c] p-6 shadow-2xl">
        <div className="flex items-center justify-between"><span className="text-[0.65rem] font-black uppercase tracking-[.18em] text-[#F5C451]">SAVIS quick start</span><button onClick={onClose} className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold">Skip</button></div>
        <div className="mt-6 flex gap-1.5">{steps.map((_,i)=><span key={i} className={`h-1.5 flex-1 rounded-full ${i<=step?"bg-[#F5C451]":"bg-white/10"}`}/>)}</div>
        <p className="mt-6 text-xs text-[#7F8C93]">Step {step+1} of {steps.length}</p>
        <h2 className="mt-1 text-2xl font-black">{current.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#B9C3C9]">{current.body}</p>
        <div className="mt-6 rounded-2xl border border-[#F5C451]/20 bg-[#F5C451]/5 p-4 text-xs text-[#D8E1E6]">Tip: use the bottom navigation to move between Home, For You, Jobs, Messages and Profile.</div>
        <div className="mt-6 flex justify-between gap-2"><button disabled={step===0} onClick={()=>setStep(v=>v-1)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold disabled:opacity-30">Back</button><button onClick={()=>step===steps.length-1?onClose():setStep(v=>v+1)} className="rounded-xl bg-[#F5C451] px-5 py-2.5 text-sm font-black text-[#141B1F]">{step===steps.length-1?"Done":"Next"}</button></div>
      </section>
    </div>
  </div>;
}
