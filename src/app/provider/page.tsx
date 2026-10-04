"use client";

import { useEffect, useState, useCallback } from "react";
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
import { releaseForJob, refundForJob } from "@/lib/wallet";
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
};

type Tab = "jobs" | "shop" | "portfolio" | "messages" | "analytics";

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

export default function ProviderPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [openJobs, setOpenJobs] = useState<Booking[]>([]);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [tab, setTab] = useState<Tab>("jobs");
  const [toast, setToast] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>("en");
  const [availability, setAvailability] = useState<AvailabilityDay[]>(DEFAULT_AVAILABILITY);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [quoteJob, setQuoteJob] = useState<Booking | null>(null);
  const [quoteAmount, setQuoteAmount] = useState(0);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);

  useEffect(() => setLangState(getLang()), []);
  function switchLang(l: Lang) {
    setLang(l);
    setLangState(l);
  }

  const refreshJobs = useCallback(() => {
    setOpenJobs(getOpenRequests());
    setActiveJobs(getAcceptedJobs());
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role, service_category, rating, review_count, verified, verification_status, availability")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(data || {
        full_name: user.user_metadata?.full_name || "Friend",
        role: user.user_metadata?.role || "provider",
      });
      setAvailable(data?.verification_status === "verified" && data?.verified === true && (data?.availability || "Available").toLowerCase() !== "offline");

      const { data: savedAvailability } = await supabase
        .from("provider_availability")
        .select("weekday, enabled, start_time, end_time, travel_radius_km")
        .eq("provider_id", user.id)
        .order("weekday");

      if (savedAvailability && savedAvailability.length > 0) {
        setAvailability(savedAvailability.map((row) => ({
          weekday: Number(row.weekday),
          enabled: Boolean(row.enabled),
          start_time: String(row.start_time || "08:00").slice(0, 5),
          end_time: String(row.end_time || "17:00").slice(0, 5),
          travel_radius_km: Number(row.travel_radius_km) || 25,
        })));
      }

      await syncBookings();
      refreshJobs();
      setLoading(false);
    }
    load();

    const onUpdate = () => refreshJobs();
    window.addEventListener("savis-bookings-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("savis-bookings-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [router, refreshJobs]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function persistAvailable(next: boolean) {
    if (next && !(profile?.verification_status === "verified" && profile?.verified === true)) {
      router.push("/provider/verification");
      return;
    }
    setAvailable(next);
    setProfile((p) => p ? { ...p, availability: next ? "Available" : "Offline" } : p);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ availability: next ? "Available" : "Offline" }).eq("id", user.id);
      }
    } catch {
      showToast("Status saved locally");
    }
  }

  async function saveAvailabilityDay(day: AvailabilityDay) {
    setAvailability((current) => current.map((item) => item.weekday === day.weekday ? day : item));
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("provider_availability").upsert({
        provider_id: user.id,
        weekday: day.weekday,
        enabled: day.enabled,
        start_time: day.start_time,
        end_time: day.end_time,
        travel_radius_km: day.travel_radius_km,
      }, { onConflict: "provider_id,weekday" });
      if (error) throw error;
      showToast("Schedule saved");
    } catch {
      showToast("Saved on this device · run the latest Supabase schema to sync");
    }
  }

  async function acceptJob(id: string) {
    await updateBookingStatus(id, "accepted");
    refreshJobs();
    showToast(lang === "sw" ? "Kazi imekubaliwa" : "Job accepted");
  }

  async function submitQuote() {
    if (!quoteJob || quoteAmount < 0) return;
    setQuoteBusy(true);
    const quote = await createQuote(quoteJob.id, quoteAmount, quoteMessage, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    if (quote) {
      await updateBookingStatus(quoteJob.id, "quote_pending", "Provider sent a SAVIS quote.");
      refreshJobs();
      setQuoteJob(null);
      setQuoteMessage("");
      showToast("Quote sent · customer can accept and lock the job");
    } else {
      showToast("Quote could not be sent. Run the latest Supabase migration.");
    }
    setQuoteBusy(false);
  }

  async function declineJob(id: string) {
    const job = getBookings().find((b) => b.id === id);
    await updateBookingStatus(id, "declined");
    if (job) refundForJob(job.rate, id, `Refund: ${job.description.slice(0, 40)}`);
    refreshJobs();
    showToast(lang === "sw" ? "Kazi imekataliwa · Pesa imerejeshwa" : "Declined · Funds refunded to wallet");
  }

  async function completeJob(id: string) {
    const job = getBookings().find((b) => b.id === id);
    await updateBookingStatus(id, "completed");
    if (job) releaseForJob(job.rate, id, `Paid: ${job.description.slice(0, 40)}`);
    refreshJobs();
    showToast(lang === "sw" ? "Kazi imekamilika · Malipo yametolewa" : "Completed · Escrow released");
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-[#B9C3C9]">{t("loading", lang)}</p></main>;
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Friend";
  const completedCount = getBookings().filter((b) => b.status === "completed").length;
  const totalEarned = getBookings().filter((b) => b.status === "completed").reduce((s, b) => s + b.rate, 0);
  const held = activeJobs.reduce((s, b) => s + b.rate, 0);
  const showShop = profile?.role === "seller" || ["carpentry", "furniture", "building materials", "refurbishment", "hardware"].some(
    (x) => (profile?.service_category || "").toLowerCase().includes(x)
  );

  const tabs: { id: Tab; label: string; icon: string; visible: boolean }[] = [
    { id: "jobs", label: "Jobs & Schedule", icon: "▦", visible: true },
    { id: "shop", label: "Products & Shop", icon: "▱", visible: showShop },
    { id: "portfolio", label: "Social & Portfolio", icon: "◫", visible: true },
    { id: "messages", label: "Messages", icon: "◌", visible: true },
    { id: "analytics", label: "Analytics & Earnings", icon: "↗", visible: true },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden pb-24 bg-[#07111f] text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#07111f]">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#3156c9]/20 blur-[110px]" />
        <div className="absolute right-[-10rem] top-24 h-[34rem] w-[34rem] rounded-full bg-[#36a9ff]/15 blur-[130px]" />
        <div className="absolute left-1/3 bottom-[-18rem] h-[38rem] w-[38rem] rounded-full bg-[#6d5dfc]/10 blur-[150px]" />
        <div className="absolute inset-0 opacity-45" style={{backgroundImage:"radial-gradient(circle at 20% 20%, rgba(255,255,255,.7) 0 1px, transparent 1.5px), radial-gradient(circle at 75% 35%, rgba(145,198,255,.7) 0 1px, transparent 1.5px), radial-gradient(circle at 45% 80%, rgba(255,255,255,.5) 0 1px, transparent 1.5px)", backgroundSize:"150px 150px, 190px 190px, 230px 230px"}} />
        <div className="absolute left-1/2 top-16 h-48 w-48 -translate-x-1/2 rounded-full bg-[#dcecff]/10 blur-3xl" />
      </div>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(7,17,31,0.78)] backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} onChange={switchLang} />
            <Link href="/profile" className="text-xs font-bold px-3 py-1.5 rounded-full border border-white/15 text-[#B9C3C9]">Profile</Link>
            <button onClick={handleLogout} className="hidden sm:block text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 text-[#B9C3C9]">{t("log.out", lang)}</button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-5">
        {/* Sticky provider identity / quick stats */}
        <section className="sticky top-[61px] z-30 -mx-4 px-4 py-4 bg-[rgba(7,17,31,0.78)] border-b border-white/10 backdrop-blur-xl">
          <div className="flex gap-3 items-center">
            <div className="w-14 h-14 rounded-full bg-[#2D3940] border border-white/10 flex items-center justify-center text-xl font-black text-[#F5C451]">
              {firstName[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-extrabold text-lg truncate">{profile?.full_name || firstName}</h1>
                {profile?.verified && <span className="text-[0.65rem] font-bold px-2 py-1 rounded-full text-[#34D399] bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.35)]">✓ Verified</span>}
              </div>
              <p className="text-xs text-[#B9C3C9]">{profile?.service_category || "Service Provider"} · {profile?.role || "provider"}</p>
            </div>
            <button onClick={() => persistAvailable(!available)} className="shrink-0 flex items-center gap-2 text-xs font-bold">
              <span className={`w-2.5 h-2.5 rounded-full ${available ? "bg-[#34D399]" : "bg-[#6B7280]"}`} />
              <span className="hidden sm:inline">{available ? "Available" : "Offline"}</span>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              [profile?.rating ? profile.rating.toFixed(1) : "—", "Rating"],
              [String(completedCount), "Jobs"],
              ["< 1 hr", "Response"],
              [available ? "Online" : "Away", "Status"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/[0.04] border border-white/8 p-2 text-center">
                <b className="block text-sm">{v}</b><span className="text-[0.62rem] text-[#7F8C93]">{l}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Mandatory KYC gate before a provider can go live */}
        {profile?.verification_status !== "verified" || profile?.verified !== true ? (
          <section className="mt-5 rounded-[24px] border border-[#F5C451]/30 bg-[rgba(245,196,81,.07)] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#F5C451] text-[#141B1F] flex items-center justify-center text-xl font-black">✓</div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-[.14em] text-[#F5C451]">Required before going live</p>
                <h2 className="mt-1 text-lg font-black">Ready to provide a service?</h2>
                <p className="mt-1 text-sm text-[#B9C3C9]">Click here to complete KYC. Consumers will only see your provider profile after SAVIS verifies you.</p>
                {profile?.verification_status === "pending" && <p className="mt-2 text-xs font-bold text-[#F5C451]">KYC submitted · awaiting review.</p>}
                {profile?.verification_status === "rejected" && <p className="mt-2 text-xs font-bold text-[#FB7185]">Your previous KYC submission was rejected. Please resubmit your documents.</p>}
              </div>
              <button onClick={() => router.push("/provider/verification")} className="rounded-2xl bg-[#F5C451] px-5 py-3 text-sm font-black text-[#141B1F] whitespace-nowrap">
                {profile?.verification_status === "pending" ? "View KYC status" : "Start KYC"}
              </button>
            </div>
          </section>
        ) : null}

        {/* Tab navigation */}
        <nav className="mt-4 overflow-x-auto -mx-4 px-4 scrollbar-hide">
          <div className="flex min-w-max gap-1 p-1 rounded-2xl bg-[rgba(13,29,48,0.72)] border border-white/10">
            {tabs.filter(x => x.visible).map(item => (
              <button key={item.id} onClick={() => setTab(item.id)} className={`px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${tab === item.id ? "bg-[#F5C451] text-[#141B1F]" : "text-[#B9C3C9] hover:text-white"}`}>
                <span className="mr-1.5">{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        </nav>

        {tab === "jobs" && (
          <div className="mt-5 space-y-4">
            <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4">
              <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(13,29,48,0.72)]">
                {(() => {
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const cells = calendarCells(calendarMonth);
                  const today = new Date();
                  const scheduledJobs = getBookings().filter((job) => job.scheduledFor && new Date(job.scheduledFor).getFullYear() === year && new Date(job.scheduledFor).getMonth() === month);
                  const scheduledValue = scheduledJobs.reduce((sum, job) => sum + job.rate, 0);
                  const selected = selectedDate ? new Date(`${selectedDate}T12:00:00`) : null;
                  const selectedWeekday = selected ? selected.getDay() : null;
                  const selectedAvailability = selectedWeekday == null ? null : availability.find((day) => day.weekday === selectedWeekday) || DEFAULT_AVAILABILITY[selectedWeekday];

                  return <>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h2 className="font-extrabold">Jobs & Schedule</h2>
                        <p className="text-xs text-[#7F8C93]">Plan working days, hours and scheduled work</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button aria-label="Previous month" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-full border border-white/10">‹</button>
                        <button onClick={() => setCalendarMonth(new Date())} className="px-3 h-8 rounded-full border border-white/10 text-[0.65rem] font-bold">Today</button>
                        <button aria-label="Next month" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-full border border-white/10">›</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="rounded-xl bg-white/[0.04] border border-white/8 p-2"><span className="text-[0.6rem] text-[#7F8C93]">Scheduled jobs</span><b className="block text-sm mt-1">{scheduledJobs.length}</b></div>
                      <div className="rounded-xl bg-white/[0.04] border border-white/8 p-2"><span className="text-[0.6rem] text-[#7F8C93]">Month value</span><b className="block text-sm mt-1 text-[#F5C451]">KSh {scheduledValue.toLocaleString()}</b></div>
                      <div className="rounded-xl bg-white/[0.04] border border-white/8 p-2"><span className="text-[0.6rem] text-[#7F8C93]">Working days</span><b className="block text-sm mt-1">{availability.filter((day) => day.enabled).length}/7</b></div>
                    </div>

                    <div className="rounded-2xl bg-black/15 border border-white/8 p-2 sm:p-3">
                      <div className="flex items-center justify-between px-1 mb-2">
                        <h3 className="font-extrabold text-sm">{monthLabel(calendarMonth)}</h3>
                        <span className="text-[0.62rem] text-[#7F8C93]">Moonlit schedule</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {DAYS.map((day) => <span key={day} className="text-center text-[0.6rem] font-bold text-[#7F8C93] py-1">{day[0]}</span>)}
                        {cells.map((day, index) => {
                          if (!day) return <div key={`empty-${index}`} className="min-h-16 sm:min-h-20 rounded-xl bg-transparent" />;
                          const key = dateKey(year, month, day);
                          const weekday = new Date(year, month, day).getDay();
                          const dayAvailability = availability.find((item) => item.weekday === weekday) || DEFAULT_AVAILABILITY[weekday];
                          const jobs = scheduledJobs.filter((job) => job.scheduledFor && new Date(job.scheduledFor).getDate() === day);
                          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                          const isSelected = selectedDate === key;
                          return <button key={key} onClick={() => setSelectedDate(key)} className={`min-h-16 sm:min-h-20 rounded-xl border p-1.5 text-left transition ${isSelected ? "border-[#F5C451] bg-[#F5C451]/10" : dayAvailability.enabled ? "border-white/8 bg-white/[0.025] hover:border-[#F5C451]/40" : "border-white/5 bg-black/20 opacity-55"}`}>
                            <div className="flex items-center justify-between gap-1"><span className={`text-xs font-bold ${isToday ? "text-[#F5C451]" : ""}`}>{day}</span>{dayAvailability.enabled && <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />}</div>
                            {jobs.slice(0, 2).map((job) => <span key={job.id} className="block mt-1 rounded-md bg-[#E22227]/15 border border-[#E22227]/25 px-1 py-0.5 text-[0.52rem] text-[#ffd4d4] truncate">{jobId(job.id)} · KSh {job.rate.toLocaleString()}</span>)}
                            {jobs.length > 2 && <span className="block text-[0.5rem] text-[#7F8C93] mt-1">+{jobs.length - 2} more</span>}
                          </button>;
                        })}
                      </div>
                    </div>

                    <div className="mt-3 grid sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-[0.62rem] text-[#7F8C93]"><span className="w-2 h-2 rounded-full bg-[#34D399]" /> Working day <span className="w-2 h-2 rounded-full bg-[#6B7280] ml-2" /> Off day <span className="w-2 h-2 rounded-full bg-[#E22227] ml-2" /> Scheduled job</div>
                      <button onClick={() => setSelectedDate(dateKey(year, month, today.getDate()))} className="text-right text-[0.65rem] font-bold text-[#F5C451]">Jump to today →</button>
                    </div>

                    {selectedAvailability && selectedDate && (
                      <div className="mt-4 p-3 rounded-2xl bg-[#0b1a2b] border border-white/10">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div><h3 className="font-extrabold text-sm">{selected.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" })}</h3><p className="text-[0.62rem] text-[#7F8C93]">Edit the recurring schedule for {DAYS[selectedWeekday ?? 0]}</p></div>
                          <button onClick={() => setSelectedDate(null)} className="text-xs text-[#7F8C93]">Close</button>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-black/20 p-3">
                          <div><b className="text-sm">Working day</b><p className="text-[0.62rem] text-[#7F8C93]">Requests can be planned for this weekday</p></div>
                          <button onClick={() => selectedAvailability && saveAvailabilityDay({ ...selectedAvailability, enabled: !selectedAvailability.enabled })} className={`w-12 h-7 rounded-full p-1 transition ${selectedAvailability.enabled ? "bg-[#34D399]" : "bg-[#374151]"}`}><span className={`block w-5 h-5 rounded-full bg-white transition ${selectedAvailability.enabled ? "translate-x-5" : ""}`} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <label className="rounded-xl bg-black/20 p-2"><span className="block text-[0.6rem] text-[#7F8C93] mb-1">Start</span><input type="time" value={selectedAvailability.start_time} onChange={(event) => saveAvailabilityDay({ ...selectedAvailability, start_time: event.target.value })} className="w-full bg-transparent text-sm font-bold outline-none" /></label>
                          <label className="rounded-xl bg-black/20 p-2"><span className="block text-[0.6rem] text-[#7F8C93] mb-1">End</span><input type="time" value={selectedAvailability.end_time} onChange={(event) => saveAvailabilityDay({ ...selectedAvailability, end_time: event.target.value })} className="w-full bg-transparent text-sm font-bold outline-none" /></label>
                        </div>
                        <label className="block rounded-xl bg-black/20 p-2 mt-2"><span className="block text-[0.6rem] text-[#7F8C93] mb-1">Travel radius (km)</span><input type="number" min={1} max={200} value={selectedAvailability.travel_radius_km} onChange={(event) => saveAvailabilityDay({ ...selectedAvailability, travel_radius_km: Number(event.target.value) || 25 })} className="w-full bg-transparent text-sm font-bold outline-none" /></label>
                      </div>
                    )}
                  </>;
                })()}
                <div className="flex gap-2 flex-wrap mt-3">
                  <span className="text-[0.65rem] px-2 py-1 rounded-full bg-white/5 text-[#B9C3C9]">{availability.filter((day) => day.enabled).length} working days / week</span>
                  <span className="text-[0.65rem] px-2 py-1 rounded-full bg-white/5 text-[#B9C3C9]">Travel radius · {Math.max(...availability.map((day) => day.travel_radius_km))} km</span>
                </div>
              </section>

              <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
                <h2 className="font-extrabold mb-3">Incoming Requests <span className="text-[#F5C451]">({openJobs.length})</span></h2>
                {openJobs.length === 0 ? <p className="text-sm text-[#B9C3C9]">No open requests right now.</p> : <div className="space-y-3">{openJobs.map(j => (
                  <div key={j.id} className="p-3 rounded-2xl bg-black/25 border border-white/8">
                    <div className="flex justify-between gap-2"><strong className="text-sm">{j.description}</strong><span className="text-[0.62rem] text-[#F5C451]">{jobId(j.id)}</span></div>
                    <p className="text-xs text-[#B9C3C9] mt-1">{j.location} · {URGENCY[j.urgency]?.[lang] || j.urgency} · KSh {j.rate.toLocaleString()}</p>
                    <div className="flex gap-2 mt-3"><button onClick={() => acceptJob(j.id)} className="flex-1 py-2 rounded-full text-xs font-bold bg-[#E22227]">Accept</button><button onClick={() => { setQuoteJob(j); setQuoteAmount(j.rate); setQuoteMessage(""); }} className="flex-1 py-2 rounded-full text-xs font-bold border border-white/15">Custom quote</button><button onClick={() => declineJob(j.id)} className="px-3 rounded-full text-xs font-bold border border-white/15">Decline</button></div>
                  </div>
                ))}</div>}
              </section>
            </div>

            {activeJobs.length > 0 && <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
              <div className="flex justify-between items-center mb-3"><h2 className="font-extrabold">Active / Ongoing Jobs</h2><span className="text-xs text-[#7F8C93]">{activeJobs.length} active</span></div>
              <div className="grid md:grid-cols-2 gap-3">{activeJobs.map(j => (
                <div key={j.id} className="p-3 rounded-2xl bg-black/25 border border-white/8">
                  <div className="flex justify-between gap-2"><strong className="text-sm">{j.description}</strong><span className="text-[0.62rem] px-2 py-1 rounded-full text-[#34D399] bg-[#34D399]/10">In Progress</span></div>
                  <p className="text-xs text-[#B9C3C9] mt-1">{jobId(j.id)} · {j.location} · KSh {j.rate.toLocaleString()}</p>
                  <div className="flex gap-2 mt-3"><button onClick={() => showToast("Messaging coming soon")} className="flex-1 py-2 rounded-full text-xs font-bold border border-white/15">Message</button><button onClick={() => showToast("Invoice flow coming next")} className="flex-1 py-2 rounded-full text-xs font-bold border border-white/15">Invoice</button><button onClick={() => completeJob(j.id)} className="flex-1 py-2 rounded-full text-xs font-bold bg-[#E22227]">Complete</button></div>
                </div>
              ))}</div>
            </section>}

            <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
              <h2 className="font-extrabold mb-3">Availability & Working Hours</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-black/20"><span className="text-xs text-[#7F8C93]">Working hours</span><b className="block mt-1">Mon–Fri · 8:00 AM – 5:00 PM</b></div>
                <div className="p-3 rounded-2xl bg-black/20"><span className="text-xs text-[#7F8C93]">Travel radius</span><b className="block mt-1">Up to 25 km</b></div>
              </div>
              <button onClick={() => { setTab("jobs"); setSelectedDate(dateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), Math.min(new Date().getDate(), new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()))); }} className="mt-3 text-xs font-bold text-[#F5C451]">Manage availability →</button>
            </section>
          </div>
        )}

        {tab === "shop" && (
          <div className="mt-5 space-y-4">
            <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
              <div className="flex justify-between items-center mb-4"><div><h2 className="font-extrabold">Products & Shop</h2><p className="text-xs text-[#7F8C93]">Manage goods and custom work listings</p></div><button onClick={() => showToast("Product editor coming next")} className="px-3 py-2 rounded-full bg-[#F5C451] text-[#141B1F] text-xs font-black">+ Add item</button></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {["Custom Furniture", "Repair Materials", "Made-to-Order Work"].map((name, i) => <div key={name} className="rounded-2xl border border-white/8 bg-black/20 overflow-hidden"><div className="h-28 bg-white/5 flex items-center justify-center text-3xl">{["🪑","🧰","🛠️"][i]}</div><div className="p-3"><b className="text-sm">{name}</b><p className="text-xs text-[#7F8C93] mt-1">{i === 1 ? "In stock · 12 units" : "Custom order"}</p><div className="flex justify-between mt-3"><span className="text-xs text-[#F5C451]">From KSh 2,500</span><button onClick={() => showToast("Listing editor coming next")} className="text-xs font-bold">Edit</button></div></div></div>)}
              </div>
            </section>
            <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]"><h2 className="font-extrabold mb-3">Product Orders</h2><p className="text-sm text-[#B9C3C9]">To Ship · Ready for Collection · Delivered will appear here.</p></section>
          </div>
        )}

        {tab === "portfolio" && (
          <div className="mt-5 space-y-4">
            <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
              <div className="flex justify-between items-center mb-4"><div><h2 className="font-extrabold">Social, Portfolio & Network</h2><p className="text-xs text-[#7F8C93]">Show your work and build trust</p></div><button onClick={() => showToast("Portfolio post editor coming next")} className="text-xs font-bold text-[#F5C451]">+ Add work</button></div>
              <div className="grid grid-cols-3 gap-2">{["Before & After", "Kitchen Install", "Finished Repair", "Custom Build", "Site Work", "Detail Shot"].map(x => <button key={x} onClick={() => showToast("Portfolio detail coming next")} className="aspect-square rounded-2xl border border-white/8 bg-black/20 flex flex-col items-center justify-center text-center p-2"><span className="text-2xl mb-2">▧</span><span className="text-[0.65rem] font-bold">{x}</span></button>)}</div>
            </section>
            <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]"><h2 className="font-extrabold mb-3">Reviews & Testimonials</h2><div className="grid sm:grid-cols-3 gap-3"><div className="p-3 rounded-2xl bg-black/20"><b>{profile?.rating?.toFixed(1) || "—"} ★</b><p className="text-xs text-[#7F8C93] mt-1">{profile?.review_count || 0} reviews</p></div><div className="sm:col-span-2 p-3 rounded-2xl bg-black/20 text-sm text-[#B9C3C9]">Client testimonials and provider replies will appear here.</div></div></section>
            <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]"><h2 className="font-extrabold mb-2">Network & Collaborations</h2><p className="text-sm text-[#B9C3C9]">Feature trusted partners and providers you work with.</p></section>
          </div>
        )}

        {tab === "messages" && (
          <div className="mt-5 p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
            <h2 className="font-extrabold">Messages & Enquiries</h2><p className="text-xs text-[#7F8C93] mt-1">One inbox for jobs, quotes and product enquiries.</p>
            <div className="grid lg:grid-cols-[230px_1fr] gap-3 mt-4 min-h-80">
              <div className="space-y-2"><div className="p-3 rounded-xl bg-[#F5C451]/10 border border-[#F5C451]/30"><b className="text-xs">Active jobs</b><span className="block text-[0.65rem] text-[#7F8C93]">Customer conversations</span></div><div className="p-3 rounded-xl bg-black/20"><b className="text-xs">Quotes</b><span className="block text-[0.65rem] text-[#7F8C93]">Pending enquiries</span></div><div className="p-3 rounded-xl bg-black/20"><b className="text-xs">Shop enquiries</b></div></div>
              <div className="rounded-2xl bg-black/20 border border-white/8 flex flex-col items-center justify-center text-center p-6"><span className="text-3xl mb-2">◌</span><b>No live conversations yet</b><p className="text-xs text-[#7F8C93] mt-1">Real-time chat, photo sharing, location pins and quote attachments will connect here.</p><button onClick={() => showToast("Quick replies coming next")} className="mt-4 text-xs font-bold text-[#F5C451]">Manage quick replies →</button></div>
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="mt-5 space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">{[
              ["KSh " + totalEarned.toLocaleString(), "Completed earnings"],
              ["KSh " + held.toLocaleString(), "Held in escrow"],
              ["KSh 0", "Available to withdraw"],
            ].map(([v,l]) => <div key={l} className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]"><span className="text-xs text-[#7F8C93]">{l}</span><b className="block text-xl mt-1">{v}</b></div>)}</div>
            <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]"><h2 className="font-extrabold mb-3">Performance</h2><div className="grid sm:grid-cols-4 gap-3">{[["100%", "Acceptance"], ["< 1 hr", "Response time"], [String(completedCount), "Completed"], [profile?.rating?.toFixed(1) || "—", "Rating"]].map(([v,l]) => <div key={l} className="p-3 rounded-2xl bg-black/20 text-center"><b>{v}</b><span className="block text-[0.65rem] text-[#7F8C93] mt-1">{l}</span></div>)}</div></section>
            <section className="p-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]"><h2 className="font-extrabold mb-3">Payouts & Pricing</h2><div className="grid sm:grid-cols-2 gap-3"><button onClick={() => showToast("Payout method settings coming next")} className="p-3 rounded-2xl bg-black/20 text-left"><b className="text-sm">M-Pesa payout</b><span className="block text-xs text-[#7F8C93] mt-1">Manage payout method →</span></button><button onClick={() => showToast("Service menu editor coming next")} className="p-3 rounded-2xl bg-black/20 text-left"><b className="text-sm">Service menu & pricing</b><span className="block text-xs text-[#7F8C93] mt-1">Rates, diagnostic fees and quote defaults →</span></button></div></section>
          </div>
        )}

        <p className="text-center text-xs text-[#55666E] mt-7">SAVIS Provider Hub · Some management tools are currently prototype UI.</p>
      </div>


      {quoteJob && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 px-4 pb-5">
          <div className="w-full max-w-md rounded-[24px] border border-white/15 bg-[#0d1d30] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#F5C451]">Structured quote</p><h2 className="mt-1 text-xl font-extrabold">Send a protected job quote</h2><p className="mt-1 text-xs text-[#7F8C93]">{jobId(quoteJob.id)} · {quoteJob.description}</p></div>
              <button type="button" onClick={() => setQuoteJob(null)} className="text-[#B9C3C9]">✕</button>
            </div>
            <label className="block mt-5"><span className="block mb-1.5 text-xs font-bold text-[#B9C3C9]">Quote amount (KSh)</span><input type="number" min={0} value={quoteAmount} onChange={(e) => setQuoteAmount(Number(e.target.value) || 0)} className="w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3.5 text-white outline-none focus:border-[#F5C451]" /></label>
            <label className="block mt-3"><span className="block mb-1.5 text-xs font-bold text-[#B9C3C9]">What is included?</span><textarea rows={3} value={quoteMessage} onChange={(e) => setQuoteMessage(e.target.value)} placeholder="Labour, materials, call-out fee, expected timing…" className="w-full resize-none rounded-2xl border border-white/15 bg-black/25 px-4 py-3.5 text-sm text-white outline-none focus:border-[#F5C451]" /></label>
            <div className="mt-3 rounded-2xl border border-[#34D399]/20 bg-[#34D399]/5 p-3"><b className="text-xs text-[#34D399]">SAVIS protection</b><p className="mt-1 text-[0.68rem] text-[#B9C3C9]">Customer sees this as a structured quote. If accepted, the job moves to Accepted and a held payment ledger entry is created for the job.</p></div>
            <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setQuoteJob(null)} className="rounded-full border border-white/15 py-3 text-xs font-bold">Cancel</button><button type="button" disabled={quoteBusy} onClick={submitQuote} className="rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] py-3 text-xs font-bold">{quoteBusy ? "Sending…" : "Send quote"}</button></div>
          </div>
        </div>
      )}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-50 px-4 py-2.5 rounded-xl bg-[#222B31] border border-white/15 text-sm shadow-xl">{toast}</div>}
    </main>
  );
}
