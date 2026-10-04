"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import Link from "next/link";

export default function DeveloperConsole(){
 const router=useRouter(); const [ok,setOk]=useState<boolean|null>(null);
 useEffect(()=>{void (async()=>{const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){router.replace("/login?next=/dev-console-9f3k");return;}const {data}=await s.rpc("is_provider_reviewer");setOk(Boolean(data));})()},[router]);
 if(ok===null)return <main className="min-h-screen grid place-items-center">Checking internal access...</main>;
 if(!ok)return <main className="min-h-screen grid place-items-center"><div className="rounded-3xl border border-white/10 p-7 text-center"><h1 className="text-2xl font-black">Access denied</h1><Link href="/" className="mt-5 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-[#222B31]">Exit</Link></div></main>;
 const sections=["User Management","Provider & Trust","Marketplace","Bookings & Payments","Messaging","Location & Search","Analytics","System","Testing"];
 return <main className="min-h-screen bg-[#070b10] px-4 py-6 text-white"><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between border-b border-white/10 py-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#F5C451]">SAVIS Internal</p><h1 className="text-2xl font-black">Developer / Super Admin</h1></div><Link href="/consumer" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold">Exit Developer Mode</Link></header><section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sections.map(x=><article key={x} className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><h2 className="font-black">{x}</h2><p className="mt-2 text-sm text-[#B9C3C9]">Secure internal controls for {x.toLowerCase()}.</p><span className="mt-4 inline-block rounded-full border border-white/15 px-3 py-1 text-xs text-[#B9C3C9]">Foundation</span></article>)}</section></div></main>;
}