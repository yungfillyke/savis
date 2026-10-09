"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import LangToggle from "@/components/LangToggle";
import { t, getLang, setLang, type Lang } from "@/lib/i18n";
import {
  getBookings,
  getOpenRequests,
  getAcceptedJobs,
  updateBookingStatus,
  syncBookings,
  type Booking,
} from "@/lib/bookings";
import {
  releaseForJob,
  refundForJob,
  getProviderAvailable,
  getProviderTransactions,
  withdrawProvider,
} from "@/lib/wallet";
import { createQuote } from "@/lib/quotes";

type Profile = {
  full_name: string | null;
  role: string | null;
  service_category?: string | null;
  rating?: number | null;
  review_count?: number | null;
  verified?: boolean | null;
  verification_status?: "unverified" | "pending" | "verified" | "rejected" | null;
  availability?: string | null;
  avatar_url?: string | null;
};

type Tab = "jobs" | "earnings" | "schedule" | "messages" | "insights";

const URGENCY: Record<string, { en: string; sw: string }> = {
  now: { en: "Right now", sw: "Sasa hivi" },
  today: { en: "Today", sw: "Leo" },
  week: { en: "This week", sw: "Wiki hii" },
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type AvailabilityDay = {
  weekday: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
  travel_radius_km: number;
};

const DEFAULT_AVAILABILITY: AvailabilityDay[] = DAYS.map((_, weekday) => ({
  weekday,
  enabled: weekday >= 1 && weekday <= 5,
  start_time: "08:00",
  end_time: "17:00",
  travel_radius_km: 25,
}));

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}
function calendarCells(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay();
  return Array.from({ length: Math.ceil((leading + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - leading + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
}
function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function jobId(id: string) {
  return `#SV-${id.slice(-4).toUpperCase()}`;
}
function greeting(lang: Lang) {
  const h = new Date().getHours();
  if (lang === "sw") return h < 12 ? "Habari ya asubuhi" : h < 17 ? "Habari ya mchana" : "Habari ya jioni";
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function dayTone(key: string, bookings: Booking[]): "idle" | "planned" | "done" {
  const onDay = bookings.filter((b) => (b.scheduledFor || b.createdAt).slice(0, 10) === key);
  if (onDay.some((b) => b.status === "completed")) return "done";
  if (onDay.some((b) => ["accepted", "en_route", "in_progress", "quote_pending", "requested", "rescheduled"].includes(b.status))) return "planned";
  return "idle";
}

export default function ProviderPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [openJobs, setOpenJobs] = useState<Booking[]>([]);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [allJobs, setAllJobs] = useState<Booking[]>([]);
  const [tab, setTab] = useState<Tab>("jobs");
  const [toast, setToast] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>("en");
  const [availability, setAvailability] = useState<AvailabilityDay[]>(DEFAULT_AVAILABILITY);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [quoteJob, setQuoteJob] = useState<Booking | null>(null);
  const [quoteAmount, setQuoteAmount] = useState(0);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [providerAvailable, setProviderAvailableAmt] = useState(0);
  const [providerTx, setProviderTx] = useState(getProviderTransactions());

  useEffect(() => setLangState(getLang()), []);
  function switchLang(l: Lang) { setLang(l); setLangState(l); }

  const refreshJobs = useCallback(() => {
    setOpenJobs(getOpenRequests());
    setActiveJobs(getAcceptedJobs());
    setAllJobs(getBookings());
    setProviderAvailableAmt(getProviderAvailable());
    setProviderTx(getProviderTransactions());
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase.from("profiles").select("full_name, role, service_category, rating, review_count, verified, verification_status, availability, avatar_url").eq("id", user.id).maybeSingle();
      setProfile(data || { full_name: user.user_metadata?.full_name || "Friend", role: user.user_metadata?.role || "provider", avatar_url: user.user_metadata?.avatar_url || null });
      setAvailable(data?.verification_status === "verified" && data?.verified === true && (data?.availability || "Available").toLowerCase() !== "offline");
      const { data: savedAvailability } = await supabase.from("provider_availability").select("weekday, enabled, start_time, end_time, travel_radius_km").eq("provider_id", user.id).order("weekday");
      if (savedAvailability?.length) {
        setAvailability(savedAvailability.map((row) => ({ weekday: Number(row.weekday), enabled: Boolean(row.enabled), start_time: String(row.start_time || "08:00").slice(0, 5), end_time: String(row.end_time || "17:00").slice(0, 5), travel_radius_km: Number(row.travel_radius_km) || 25 })));
      }
      await syncBookings();
      refreshJobs();
      setLoading(false);
    }
    load();
    const onUpdate = () => refreshJobs();
    window.addEventListener("savis-bookings-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => { window.removeEventListener("savis-bookings-updated", onUpdate); window.removeEventListener("storage", onUpdate); };
  }, [router, refreshJobs]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  async function persistAvailable(next: boolean) {
    if (next && !(profile?.verification_status === "verified" && profile?.verified === true)) { router.push("/provider/verification"); return; }
    setAvailable(next);
    setProfile((p) => (p ? { ...p, availability: next ? "Available" : "Offline" } : p));
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("profiles").update({ availability: next ? "Available" : "Offline" }).eq("id", user.id);
    } catch { showToast("Status saved locally"); }
  }

  async function saveAvailabilityDay(day: AvailabilityDay) {
    setAvailability((current) => current.map((item) => (item.weekday === day.weekday ? day : item)));
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("provider_availability").upsert({ provider_id: user.id, weekday: day.weekday, enabled: day.enabled, start_time: day.start_time, end_time: day.end_time, travel_radius_km: day.travel_radius_km }, { onConflict: "provider_id,weekday" });
      showToast(lang === "sw" ? "Ratiba imehifadhiwa" : "Schedule saved");
    } catch { showToast("Saved on this device"); }
  }

  async function acceptJob(id: string) { await updateBookingStatus(id, "accepted"); refreshJobs(); showToast(lang === "sw" ? "Kazi imekubaliwa" : "Job accepted"); }
  async function declineJob(id: string) {
    const job = getBookings().find((b) => b.id === id);
    await updateBookingStatus(id, "declined");
    if (job) refundForJob(job.rate, id, `Refund: ${job.description.slice(0, 40)}`);
    refreshJobs();
    showToast(lang === "sw" ? "Kazi imekataliwa" : "Declined · Funds refunded to customer");
  }
  async function completeJob(id: string) {
    const job = getBookings().find((b) => b.id === id);
    await updateBookingStatus(id, "completed");
    if (job) { releaseForJob(job.rate, id, `Paid: ${job.description.slice(0, 40)}`); showToast(lang === "sw" ? `Kamilifu · KSh ${job.rate.toLocaleString()}` : `Completed · KSh ${job.rate.toLocaleString()} released to your wallet`); }
    else showToast("Job completed");
    refreshJobs();
  }
  async function startJob(id: string) { await updateBookingStatus(id, "in_progress"); refreshJobs(); showToast(lang === "sw" ? "Kazi imeanza" : "Job in progress"); }
  async function submitQuote() {
    if (!quoteJob || quoteAmount < 0) return;
    setQuoteBusy(true);
    const quote = await createQuote(quoteJob.id, quoteAmount, quoteMessage, new Date(Date.now() + 86400000).toISOString());
    if (quote) { await updateBookingStatus(quoteJob.id, "quote_pending", "Provider sent a SAVIS quote."); refreshJobs(); setQuoteJob(null); setQuoteMessage(""); showToast(lang === "sw" ? "Nukuu imetumwa" : "Quote sent"); }
    else showToast("Quote could not be sent.");
    setQuoteBusy(false);
  }
  function handleWithdraw() {
    if (providerAvailable <= 0) { showToast("No available balance"); return; }
    const result = withdrawProvider(providerAvailable);
    showToast(result.message);
    refreshJobs();
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Friend";
  const rating = profile?.rating ? profile.rating.toFixed(1) : "—";
  const pendingBalance = activeJobs.reduce((s, b) => s + b.rate, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const earnedThisMonth = allJobs.filter((b) => b.status === "completed" && new Date(b.createdAt) >= monthStart).reduce((s, b) => s + b.rate, 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const completedThisWeek = useMemo(() => allJobs.filter((b) => b.status === "completed" && new Date(b.createdAt).getTime() >= weekAgo), [allJobs]);
  const weekEarnings = completedThisWeek.reduce((s, b) => s + b.rate, 0);
  const isVerified = profile?.verification_status === "verified" && profile?.verified === true;
  const tabs: { id: Tab; label: string }[] = [
    { id: "jobs", label: lang === "sw" ? "Kazi" : "Jobs" },
    { id: "earnings", label: lang === "sw" ? "Mapato" : "Earnings" },
    { id: "schedule", label: lang === "sw" ? "Ratiba" : "Schedule" },
    { id: "messages", label: lang === "sw" ? "Ujumbe" : "Messages" },
    { id: "insights", label: lang === "sw" ? "Muhtasari" : "Insights" },
  ];

  if (loading) return <main className="min-h-screen flex items-center justify-center bg-[#f4f6f8]"><p className="text-slate-500">{t("loading", lang)}</p></main>;

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const cells = calendarCells(calendarMonth);

  return (
    <main className="min-h-screen pb-28 bg-[#f4f6f8] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} onChange={switchLang} />
            <Link href="/profile" className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600">{lang === "sw" ? "Wasifu" : "Profile"}</Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-4">
        <section className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#E22227] to-[#C7080C] flex items-center justify-center text-xl font-black text-white shrink-0">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : firstName[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500">{greeting(lang)}</p>
              <h1 className="text-lg font-black truncate">{firstName}</h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {isVerified ? (
                  <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200">✓ {lang === "sw" ? "Imethibitishwa" : "Verified"}</span>
                ) : (
                  <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 border border-amber-200">{profile?.verification_status === "pending" ? (lang === "sw" ? "Inasubiri" : "Pending") : (lang === "sw" ? "Haijathibitishwa" : "Not verified")}</span>
                )}
                <span className="text-[0.65rem] text-slate-500">{profile?.service_category || "Provider"}</span>
              </div>
            </div>
            <button type="button" onClick={() => persistAvailable(!available)} className={`shrink-0 flex flex-col items-center justify-center rounded-2xl px-3 py-2.5 min-w-[76px] border-2 ${available ? "bg-emerald-50 border-emerald-400 text-emerald-800" : "bg-slate-100 border-slate-300 text-slate-500"}`}>
              <span className={`w-3 h-3 rounded-full mb-1 ${available ? "bg-emerald-500" : "bg-slate-400"}`} />
              <span className="text-[0.7rem] font-black">{available ? (lang === "sw" ? "Mtandaoni" : "Online") : (lang === "sw" ? "Nje" : "Offline")}</span>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[[`KSh ${providerAvailable.toLocaleString()}`, lang === "sw" ? "Salio" : "Available"], [String(activeJobs.length), lang === "sw" ? "Hai" : "Active"], [String(openJobs.length), lang === "sw" ? "Mipya" : "New"], [rating, lang === "sw" ? "Alama" : "Rating"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5 text-center">
                <b className="block text-sm font-black truncate">{v}</b>
                <span className="text-[0.62rem] font-semibold text-slate-500">{l}</span>
              </div>
            ))}
          </div>
        </section>

        {!isVerified && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-amber-700">{lang === "sw" ? "Inahitajika" : "Required before going live"}</p>
            <h2 className="mt-1 font-black">{lang === "sw" ? "Kamilisha KYC" : "Complete verification (KYC)"}</h2>
            <button type="button" onClick={() => router.push("/provider/verification")} className="mt-3 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-black text-white">{profile?.verification_status === "pending" ? (lang === "sw" ? "Angalia hali" : "View status") : (lang === "sw" ? "Anza KYC" : "Start KYC")}</button>
          </section>
        )}

        <nav className="overflow-x-auto -mx-4 px-4">
          <div className="flex min-w-max gap-1 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm">
            {tabs.map((item) => (
              <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap ${tab === item.id ? "bg-slate-900 text-white" : "text-slate-500"}`}>{item.label}</button>
            ))}
          </div>
        </nav>

        {tab === "jobs" && (
          <div className="space-y-4">
            <section className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
              <h2 className="font-black">{lang === "sw" ? "Maombi mapya" : "New job requests"}</h2>
              <p className="text-xs text-slate-500 mb-3">{lang === "sw" ? "Kubali, tuma nukuu, au kataa" : "Accept, send a quote, or decline"}</p>
              {openJobs.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">{lang === "sw" ? "Hakuna maombi mapya." : "No new requests. Stay online to receive work."}</p> : (
                <div className="space-y-3">{openJobs.map((j) => (
                  <div key={j.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="flex justify-between gap-2"><strong className="text-sm">{j.skill || j.description.slice(0, 48)}</strong><span className="text-[0.62rem] font-bold text-slate-400">{jobId(j.id)}</span></div>
                    <p className="text-xs text-slate-600 mt-1">{j.location} · {URGENCY[j.urgency]?.[lang] || j.urgency}{j.rate > 0 ? ` · KSh ${j.rate.toLocaleString()}` : ` · ${lang === "sw" ? "Nukuu inahitajika" : "Quote needed"}`}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{j.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button type="button" onClick={() => acceptJob(j.id)} className="flex-1 min-w-[90px] py-2.5 rounded-full text-xs font-black bg-emerald-600 text-white">{lang === "sw" ? "Kubali" : "Accept"}</button>
                      <button type="button" onClick={() => { setQuoteJob(j); setQuoteAmount(j.rate || 0); setQuoteMessage(""); }} className="flex-1 min-w-[90px] py-2.5 rounded-full text-xs font-black border-2 border-slate-300 bg-white">{lang === "sw" ? "Tuma nukuu" : "Send quote"}</button>
                      <button type="button" onClick={() => declineJob(j.id)} className="px-4 py-2.5 rounded-full text-xs font-black border border-red-200 text-red-600 bg-red-50">{lang === "sw" ? "Kataa" : "Decline"}</button>
                    </div>
                  </div>
                ))}</div>
              )}
            </section>

            <section className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
              <h2 className="font-black">{lang === "sw" ? "Kazi zangu" : "My active jobs"}</h2>
              <p className="text-xs text-slate-500 mb-3">{lang === "sw" ? "Kubaliwa → Inaendelea → Imekamilika" : "Accepted → In progress → Completed"}</p>
              {activeJobs.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">{lang === "sw" ? "Hakuna kazi hai." : "No active jobs yet."}</p> : (
                <div className="space-y-3">{activeJobs.map((j) => (
                  <div key={j.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="flex justify-between gap-2"><strong className="text-sm">{j.description}</strong><span className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 capitalize">{j.status.replace("_", " ")}</span></div>
                    <p className="text-xs text-slate-600 mt-1">{jobId(j.id)} · {j.location} · KSh {j.rate.toLocaleString()}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {j.status === "accepted" && <button type="button" onClick={() => startJob(j.id)} className="flex-1 min-w-[90px] py-2.5 rounded-full text-xs font-black border-2 border-slate-300 bg-white">{lang === "sw" ? "Anza kazi" : "Start job"}</button>}
                      <button type="button" onClick={() => setTab("messages")} className="flex-1 min-w-[90px] py-2.5 rounded-full text-xs font-black border border-slate-200 bg-white">{lang === "sw" ? "Ujumbe" : "Message"}</button>
                      <a href={j.latitude != null && j.longitude != null ? `https://www.google.com/maps/dir/?api=1&destination=${j.latitude},${j.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.location)}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[90px] py-2.5 rounded-full text-xs font-black border border-slate-200 bg-white text-center">{lang === "sw" ? "Maelekezo" : "Directions"}</a>
                      <button type="button" onClick={() => completeJob(j.id)} className="flex-1 min-w-[90px] py-2.5 rounded-full text-xs font-black bg-emerald-600 text-white">{lang === "sw" ? "Kamilisha" : "Complete"}</button>
                    </div>
                    <p className="text-[0.65rem] text-emerald-700 mt-2 font-semibold">{lang === "sw" ? `KSh ${j.rate.toLocaleString()} itatolewa ukikamilisha.` : `KSh ${j.rate.toLocaleString()} will be released to your wallet when you complete.`}</p>
                  </div>
                ))}</div>
              )}
            </section>
          </div>
        )}

        {tab === "earnings" && (
          <div className="space-y-4">
            <section className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
              <h2 className="font-black mb-1">{lang === "sw" ? "Pochi ya SAVIS" : "SAVIS Wallet"}</h2>
              <p className="text-xs text-slate-500 mb-4">{lang === "sw" ? "Pesa inahifadhiwa salama hadi kazi ikamilike. Hii inakulinda wewe na mteja." : "Money is held safely until the job is completed. This protects both you and the customer."}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-center"><b className="block text-base font-black text-emerald-800">KSh {providerAvailable.toLocaleString()}</b><span className="text-[0.62rem] font-semibold text-emerald-700">{lang === "sw" ? "Inapatikana" : "Available"}</span></div>
                <div className="rounded-2xl bg-orange-50 border border-orange-100 p-3 text-center"><b className="block text-base font-black text-orange-800">KSh {pendingBalance.toLocaleString()}</b><span className="text-[0.62rem] font-semibold text-orange-700">{lang === "sw" ? "Inasubiri" : "Pending"}</span></div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center"><b className="block text-base font-black">KSh {earnedThisMonth.toLocaleString()}</b><span className="text-[0.62rem] font-semibold text-slate-500">{lang === "sw" ? "Mwezi huu" : "This month"}</span></div>
              </div>
              <button type="button" disabled={providerAvailable <= 0} onClick={handleWithdraw} className="mt-4 w-full py-3.5 rounded-full font-black text-white bg-gradient-to-r from-[#E22227] to-[#C7080C] disabled:opacity-40">{lang === "sw" ? "Toa kwenda M-Pesa" : "Withdraw to M-Pesa"}</button>
            </section>
            <section className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
              <h2 className="font-black mb-3">{lang === "sw" ? "Miamala" : "Recent transactions"}</h2>
              {providerTx.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">{lang === "sw" ? "Hakuna miamala bado." : "No transactions yet."}</p> : (
                <div className="space-y-2">{providerTx.slice(0, 12).map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <div><p className="text-sm font-semibold">{tx.label}</p><p className="text-[0.65rem] text-slate-400">{new Date(tx.createdAt).toLocaleString("en-KE")}</p></div>
                    <span className={`text-sm font-black ${tx.type === "withdraw" ? "text-red-600" : "text-emerald-600"}`}>{tx.type === "withdraw" ? "−" : "+"}KSh {tx.amount.toLocaleString()}</span>
                  </div>
                ))}</div>
              )}
            </section>
          </div>
        )}

        {tab === "schedule" && (
          <div className="space-y-4">
            <section className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-black">{monthLabel(calendarMonth)}</h2>
                  <p className="text-xs text-slate-500"><span className="inline-block w-2 h-2 rounded-full bg-slate-300 mr-1" />{lang === "sw" ? "Hakuna" : "Idle"} <span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1 ml-2" />{lang === "sw" ? "Imepangwa" : "Planned"} <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1 ml-2" />{lang === "sw" ? "Imekamilika" : "Done"}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-full border border-slate-200">‹</button>
                  <button type="button" onClick={() => setCalendarMonth(new Date())} className="px-3 h-8 rounded-full border border-slate-200 text-[0.65rem] font-bold">{lang === "sw" ? "Leo" : "Today"}</button>
                  <button type="button" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-full border border-slate-200">›</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-bold text-slate-400 mb-1">{DAYS.map((d) => <div key={d}>{d}</div>)}</div>
              <div className="grid grid-cols-7 gap-1">{cells.map((day, i) => {
                if (day == null) return <div key={`e-${i}`} className="aspect-square" />;
                const key = dateKey(year, month, day);
                const tone = dayTone(key, allJobs);
                const bg = tone === "done" ? "bg-emerald-100 border-emerald-300 text-emerald-900" : tone === "planned" ? "bg-orange-100 border-orange-300 text-orange-900" : "bg-slate-100 border-slate-200 text-slate-500";
                return <div key={key} className={`aspect-square rounded-xl border text-xs font-bold flex items-center justify-center ${bg}`}>{day}</div>;
              })}</div>
            </section>
            <section className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
              <h2 className="font-black mb-3">{lang === "sw" ? "Saa za kazi" : "Working hours"}</h2>
              <div className="space-y-2">{availability.slice().sort((a, b) => a.weekday - b.weekday).map((day) => (
                <div key={day.weekday} className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <button type="button" onClick={() => saveAvailabilityDay({ ...day, enabled: !day.enabled })} className={`w-16 text-xs font-black py-1.5 rounded-full ${day.enabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>{DAYS[day.weekday]}</button>
                  <input type="time" value={day.start_time} disabled={!day.enabled} onChange={(e) => saveAvailabilityDay({ ...day, start_time: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:opacity-40" />
                  <span className="text-xs text-slate-400">–</span>
                  <input type="time" value={day.end_time} disabled={!day.enabled} onChange={(e) => saveAvailabilityDay({ ...day, end_time: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:opacity-40" />
                  <select value={day.travel_radius_km} disabled={!day.enabled} onChange={(e) => saveAvailabilityDay({ ...day, travel_radius_km: Number(e.target.value) })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:opacity-40">{[10, 15, 20, 25, 30, 40, 50].map((km) => <option key={km} value={km}>{km} km</option>)}</select>
                </div>
              ))}</div>
            </section>
          </div>
        )}

        {tab === "messages" && (
          <section className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
            <h2 className="font-black mb-1">{lang === "sw" ? "Ujumbe wa kazi" : "Job messages"}</h2>
            <p className="text-xs text-slate-500 mb-4">{lang === "sw" ? "Mazungumzo ya kazi za SAVIS pekee." : "Only conversations for jobs started on SAVIS."}</p>
            {activeJobs.length === 0 && openJobs.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">{lang === "sw" ? "Hakuna mazungumzo bado." : "No job conversations yet."}</p> : (
              <div className="space-y-2">{[...activeJobs, ...openJobs].slice(0, 10).map((j) => (
                <Link key={j.id} href={`/messages?job=${j.id}`} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-black text-slate-600">{(j.consumerName || j.location || "C").charAt(0)}</div>
                  <div className="min-w-0 flex-1"><b className="block text-sm truncate">{j.consumerName || j.location}</b><p className="text-xs text-slate-500 truncate">{j.skill} · {jobId(j.id)}</p></div>
                  <span className="text-slate-400">→</span>
                </Link>
              ))}</div>
            )}
          </section>
        )}

        {tab === "insights" && (
          <section className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">{lang === "sw" ? "Wiki hii" : "This week"}</p>
            <h2 className="text-xl font-black mt-1">{lang === "sw" ? `Ulikamilisha kazi ${completedThisWeek.length} na kupata KSh ${weekEarnings.toLocaleString()}` : `You completed ${completedThisWeek.length} job${completedThisWeek.length === 1 ? "" : "s"} and earned KSh ${weekEarnings.toLocaleString()}`}</h2>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><b className="block text-lg font-black">{completedThisWeek.length}</b><span className="text-xs text-slate-500">{lang === "sw" ? "Zilizokamilika" : "Completed"}</span></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><b className="block text-lg font-black">{activeJobs.length}</b><span className="text-xs text-slate-500">{lang === "sw" ? "Zinazoendelea" : "In progress"}</span></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><b className="block text-lg font-black">{rating}</b><span className="text-xs text-slate-500">{lang === "sw" ? "Alama" : "Rating"}</span></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><b className="block text-lg font-black">{profile?.review_count || 0}</b><span className="text-xs text-slate-500">{lang === "sw" ? "Maoni" : "Reviews"}</span></div>
            </div>
            <p className="text-sm text-slate-500 text-center mt-4">{lang === "sw" ? "Beji Bronze → Silver → Gold zinakuja." : "Bronze → Silver → Gold badges coming soon."}</p>
          </section>
        )}
      </div>

      {quoteJob && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 px-4 pb-5">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex justify-between"><div><p className="text-[0.65rem] font-bold uppercase text-[#E22227]">{lang === "sw" ? "Nukuu" : "Quote"}</p><h2 className="font-black">{lang === "sw" ? "Tuma nukuu" : "Send quote"}</h2></div><button type="button" onClick={() => setQuoteJob(null)}>✕</button></div>
            <label className="block mt-4"><span className="text-xs font-bold text-slate-500">KSh</span><input type="number" min={0} value={quoteAmount} onChange={(e) => setQuoteAmount(Number(e.target.value) || 0)} className="w-full mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
            <label className="block mt-3"><span className="text-xs font-bold text-slate-500">{lang === "sw" ? "Nini kimejumuishwa?" : "Included"}</span><textarea rows={3} value={quoteMessage} onChange={(e) => setQuoteMessage(e.target.value)} className="w-full mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" /></label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setQuoteJob(null)} className="rounded-full border border-slate-200 py-3 text-xs font-bold">{lang === "sw" ? "Ghairi" : "Cancel"}</button>
              <button type="button" disabled={quoteBusy} onClick={() => void submitQuote()} className="rounded-full bg-gradient-to-r from-[#E22227] to-[#C7080C] py-3 text-xs font-bold text-white">{quoteBusy ? "…" : (lang === "sw" ? "Tuma" : "Send")}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-xl max-w-[90vw] text-center">{toast}</div>}
    </main>
  );
}
