"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AccountMenu from "@/components/AccountMenu";
import LangToggle from "@/components/LangToggle";
import { t, getLang, setLang, type Lang } from "@/lib/i18n";
import { distanceKm, getSavedLocation, requestCurrentLocation, type UserLocation } from "@/lib/location";

type Profile = { full_name: string | null; role: string | null; email: string | null };

type Provider = {
  id: string;
  name: string;
  skill: string;
  area: string;
  km: number;
  rate: number;
  rating: number;
  reviews: number;
  icon: string;
  available: string;
  tags: string[];
  latitude?: number;
  longitude?: number;
  verified?: boolean;
  bio?: string;
};

const CATEGORIES = [
  ["all", "All", "✨"], ["Plumbing", "Plumbing", "🔧"], ["Electrical", "Electrical", "⚡"],
  ["Masonry", "Masonry", "🧱"], ["Mechanics", "Mechanics", "🚗"], ["Cleaning", "Cleaning", "🧹"],
  ["Carpentry", "Carpentry", "🪚"], ["Welding", "Welding", "🔥"], ["Tailoring", "Tailoring", "🧵"],
  ["Painting", "Painting", "🎨"], ["Hardware", "Hardware", "🏪"], ["Quantity Surveying", "QS", "📐"],
  ["Architecture", "Architecture", "🏛️"], ["Legal", "Legal", "⚖️"], ["Accounting", "Accounting", "🧾"],
  ["Engineering", "Engineering", "⚙️"], ["Photography", "Photo", "📷"],
];

const SAMPLE_PROVIDERS: Provider[] = [
  { id: "1", name: "James Otieno", skill: "Plumbing", area: "Westlands", km: 1.2, rate: 1500, rating: 4.9, reviews: 87, icon: "🔧", available: "Available today", tags: ["M-Pesa"], latitude: -1.2676, longitude: 36.8108 },
  { id: "2", name: "Peter Kamau", skill: "Masonry", area: "Kilimani", km: 2.4, rate: 2000, rating: 4.7, reviews: 42, icon: "🧱", available: "This week", tags: ["Cash", "M-Pesa"], latitude: -1.2921, longitude: 36.7876 },
  { id: "3", name: "Grace Wanjiku", skill: "Tailoring", area: "Parklands", km: 0.8, rate: 800, rating: 5.0, reviews: 63, icon: "✂️", available: "Available now", tags: ["M-Pesa"], latitude: -1.2580, longitude: 36.8170 },
  { id: "4", name: "Brian Mutua", skill: "Electrical", area: "Ruaka", km: 3.1, rate: 1800, rating: 4.8, reviews: 54, icon: "⚡", available: "Available today", tags: ["M-Pesa"], latitude: -1.2046, longitude: 36.7760 },
  { id: "5", name: "Amina Hassan", skill: "Cleaning", area: "Eastleigh", km: 1.9, rate: 1200, rating: 4.6, reviews: 31, icon: "🧹", available: "Available now", tags: ["M-Pesa"], latitude: -1.2760, longitude: 36.8500 },
  { id: "6", name: "Samuel Kiptoo", skill: "Carpentry", area: "Kasarani", km: 4.2, rate: 2500, rating: 4.5, reviews: 28, icon: "🪚", available: "This week", tags: ["Cash", "M-Pesa"], latitude: -1.2218, longitude: 36.8970 },
  { id: "7", name: "Lucy Njeri", skill: "Painting", area: "Westlands", km: 1.5, rate: 1600, rating: 4.9, reviews: 39, icon: "🎨", available: "Available today", tags: ["M-Pesa"], latitude: -1.2676, longitude: 36.8108 },
  { id: "8", name: "David Ochieng", skill: "Photography", area: "Kilimani", km: 2.0, rate: 3000, rating: 4.8, reviews: 71, icon: "📷", available: "This week", tags: ["M-Pesa"], latitude: -1.2921, longitude: 36.7876 },
];

const ICONS: Record<string, string> = {
  Plumbing: "🔧", Masonry: "🧱", Electrical: "⚡", Tailoring: "✂️", Cleaning: "🧹",
  Carpentry: "🪚", Painting: "🎨", Photography: "📷",
};

function providerFromRow(row: Record<string, unknown>): Provider {
  const skill = String(row.service_category || "General help");
  return {
    id: String(row.id),
    name: String(row.full_name || "SAVIS provider"),
    skill,
    area: String(row.location_name || "Nearby"),
    km: Number(row.distance_km) || 0,
    rate: Number(row.hourly_rate) || 0,
    rating: Number(row.rating) || 0,
    reviews: Number(row.review_count) || 0,
    icon: ICONS[skill] || "🛠️",
    available: String(row.availability || "Available"),
    tags: ["M-Pesa"],
    latitude: row.latitude == null ? undefined : Number(row.latitude),
    longitude: row.longitude == null ? undefined : Number(row.longitude),
    verified: Boolean(row.verified),
    bio: String(row.bio || "A local SAVIS provider ready to help."),
  };
}

export default function ConsumerPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [lang, setLangState] = useState<Lang>("en");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [providers, setProviders] = useState<Provider[]>(SAMPLE_PROVIDERS);
  const [realProviders, setRealProviders] = useState(false);
  const [providerMessage, setProviderMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"home" | "for-you" | "jobs" | "messages" | "profile">("home");
  const [mapMode, setMapMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [radius, setRadius] = useState(10);

  useEffect(() => {
    setLangState(getLang());
    setUserLocation(getSavedLocation());
  }, []);

  function switchLang(next: Lang) {
    setLang(next);
    setLangState(next);
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase.from("profiles").select("full_name, role, email").eq("id", user.id).maybeSingle();
      setProfile(data || {
        full_name: user.user_metadata?.full_name || "Friend",
        role: user.user_metadata?.role || "consumer",
        email: user.email || null,
      });
      setLoading(false);
    }
    load();
  }, [router]);

  async function loadProviders(location: UserLocation | null, category: string) {
    const supabase = createClient();
    const categoryArg = category === "all" ? null : category;

    if (location) {
      const rpc = await supabase.rpc("search_nearby_providers", {
        p_lat: location.latitude,
        p_lng: location.longitude,
        p_radius_km: 25,
        p_category: categoryArg,
        p_limit: 40,
      });
      if (!rpc.error && rpc.data?.length) {
        setProviders(rpc.data.map(providerFromRow));
        setRealProviders(true);
        setProviderMessage("Live provider locations from SAVIS.");
        return;
      }
    }

    const result = await supabase
      .from("profiles")
      .select("id, full_name, role, latitude, longitude, location_name, service_category, hourly_rate, rating, review_count, availability, verified, bio")
      .in("role", ["provider", "professional"])
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(40);

    if (!result.error && result.data?.length) {
      const rows = result.data.map((row) => ({
        ...row,
        distance_km: location && row.latitude != null && row.longitude != null
          ? distanceKm(location, { latitude: Number(row.latitude), longitude: Number(row.longitude) })
          : 0,
      })).filter((row) => !categoryArg || String(row.service_category || "").toLowerCase() === categoryArg.toLowerCase());

      setProviders(rows.map(providerFromRow).sort((a, b) => a.km - b.km));
      setRealProviders(true);
      setProviderMessage("Live provider profiles from SAVIS.");
      return;
    }

    setProviders(SAMPLE_PROVIDERS);
    setRealProviders(false);
    setProviderMessage("Showing Alpha sample providers until provider profiles are published.");
  }

  useEffect(() => {
    if (!loading) void loadProviders(userLocation, activeCategory);
  }, [loading, userLocation, activeCategory]);

  async function enableLocation() {
    setLocationBusy(true);
    setLocationMessage("");
    try {
      const location = await requestCurrentLocation();
      setUserLocation(location);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          latitude: location.latitude,
          longitude: location.longitude,
          location_name: "Current location",
        }).eq("id", user.id);
      }
      setLocationMessage("Using your current location for nearby results.");
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : "We could not get your location.");
    } finally {
      setLocationBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return providers.filter((p) => {
      const categoryMatch = activeCategory === "all" || p.skill === activeCategory;
      const searchMatch = !q || [p.name, p.skill, p.area].some((value) => value.toLowerCase().includes(q));
      return categoryMatch && searchMatch;
    }).sort((a, b) => a.km - b.km);
  }, [providers, search, activeCategory]);

  const firstName = profile?.full_name?.split(" ")[0] || "Friend";
  const mapCenter = userLocation || { latitude: -1.2864, longitude: 36.8172 };
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.longitude - 0.08}%2C${mapCenter.latitude - 0.06}%2C${mapCenter.longitude + 0.08}%2C${mapCenter.latitude + 0.06}&layer=mapnik&marker=${mapCenter.latitude}%2C${mapCenter.longitude}`;

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-[#B9C3C9]">Loading…</p></main>;
  }

  const tabItems = [
    { id: "home" as const, label: "Home", icon: "⌂" },
    { id: "for-you" as const, label: "For You", icon: "✦" },
    { id: "jobs" as const, label: "Jobs", icon: "▣" },
    { id: "messages" as const, label: "Messages", icon: "◌" },
    { id: "profile" as const, label: "Profile", icon: "◉" },
  ];

  const setTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progress = (status: string) => ({
    requested: 20,
    accepted: 45,
    declined: 0,
    completed: 100,
  }[status] ?? 20);

  return (
    <main className="min-h-screen pb-28">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(34,43,49,0.9)] px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <Link href="/consumer" aria-label="SAVIS home" className="text-xl font-black tracking-tight">SAVIS</Link>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setMapMode(true)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.68rem] font-bold text-[#B9C3C9]">🗺 Map</button>
            <button type="button" onClick={() => setShowTutorial(true)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 font-black">?</button>
            <AccountMenu name={profile?.full_name || "Account"} role={profile?.role || "consumer"} homeHref="/consumer" />
          </div>
        </div>
      </header>

      {activeTab === "home" && (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <section className="mb-5 rounded-[24px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4">
            <p className="text-sm text-[#B9C3C9]">{t("welcome.back", lang)}</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div><h1 className="text-2xl font-extrabold tracking-tight">Hi, {firstName} 👋</h1><p className="mt-1 text-sm text-[#B9C3C9]">What do you need help with today?</p></div>
              <button type="button" onClick={() => setTab("profile")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] text-sm font-extrabold">{firstName.charAt(0).toUpperCase()}</button>
            </div>
          </section>

          <section className="mb-4">
            <div className="flex gap-2 rounded-full bg-white p-1.5 shadow-xl">
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-full px-4 py-3 text-[0.95rem] text-[#222B31] outline-none" placeholder="Search services, providers or shops…" />
              <button type="button" onClick={() => document.getElementById("nearby-results")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] px-5 py-3 text-sm font-bold text-white">Search</button>
            </div>
            <div className="mt-3 flex items-center gap-2 px-1">
              <span className="text-[#B9C3C9]">📍</span><span className="min-w-0 flex-1 truncate text-sm text-[#B9C3C9]">{userLocation ? "Current location" : "Nairobi"}</span>
              <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="rounded-full border border-white/10 bg-[#222B31] px-3 py-1.5 text-xs font-bold outline-none"><option value={5}>Within 5 km</option><option value={10}>Within 10 km</option><option value={25}>Within 25 km</option><option value={50}>Within 50 km</option></select>
              <button type="button" onClick={enableLocation} disabled={locationBusy} className="text-xs font-bold text-[#F5C451]">{locationBusy ? "…" : "Use my location"}</button>
            </div>
            {locationMessage && <p className="mt-2 px-1 text-xs text-[#B9C3C9]">{locationMessage}</p>}
          </section>

          <section className="mb-5 overflow-hidden rounded-[20px] border border-[rgba(245,196,81,0.28)] bg-gradient-to-br from-[rgba(108,1,2,0.92)] to-[rgba(34,43,49,0.92)] p-5">
            <div className="flex items-center justify-between"><span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wider text-[#F5C451]">Sponsored</span><span className="text-xs text-[#B9C3C9]">Local business</span></div>
            <h2 className="mt-3 text-lg font-extrabold">Trusted help, close to you.</h2><p className="mt-1 text-sm leading-relaxed text-[#e6d9da]">Find a provider, compare options and request a job without leaving SAVIS.</p>
          </section>

          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold text-lg">Categories</h2><span className="text-xs text-[#B9C3C9]">17 service types</span></div>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.slice(0, 12).map(([id, name, icon]) => <button key={id} type="button" onClick={() => { setActiveCategory(id); setTab("home"); }} className={`rounded-2xl border p-2.5 text-center transition ${activeCategory === id ? "border-[#E22227] bg-[rgba(226,34,39,0.2)]" : "border-white/10 bg-[rgba(34,43,49,0.72)]"}`}><span className="block text-xl">{icon}</span><span className="mt-1 block truncate text-[0.65rem] font-bold text-[#B9C3C9]">{name}</span></button>)}
            </div>
            <button type="button" onClick={() => setShowTutorial(true)} className="mt-3 text-xs font-bold text-[#F5C451]">How SAVIS works →</button>
          </section>

          <section className="mb-6 overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
            <div className="flex items-center justify-between gap-3 px-4 pt-4"><div><h2 className="font-extrabold text-lg">Live nearby</h2><p className="mt-0.5 text-xs text-[#B9C3C9]">{realProviders ? `Providers within ${radius} km` : "Alpha sample providers"}</p></div><button type="button" onClick={() => setMapMode(true)} className="text-xs font-bold text-[#F5C451]">Open map →</button></div>
            <div className="relative mt-4 overflow-hidden border-y border-white/10">
              <iframe title="SAVIS nearby map" src={mapUrl} className="h-56 w-full border-0" loading="lazy" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#11171c]/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-[#11171c]/85 px-3 py-1.5 text-[0.65rem] font-bold backdrop-blur">● {filtered.length{'}'} nearby results</div>
            </div>
            <p className="px-4 py-3 text-[0.62rem] text-[#55666E]">Map data © OpenStreetMap contributors. Full interactive provider pins are the next map-layer upgrade.</p>
          </section>

          <section id="nearby-results" className="mb-6">
            <div className="mb-3 flex items-center justify-between"><div><h2 className="font-extrabold text-lg">{search || activeCategory !== "all" ? `Results (${filtered.length})` : "People near you"}</h2><p className="mt-0.5 text-xs text-[#B9C3C9]">{providerMessage || "Trusted local providers"}</p></div>{(search || activeCategory !== "all") && <button type="button" onClick={() => { setSearch(""); setActiveCategory("all"); }} className="text-xs font-bold text-[#F5C451]">Clear</button>}</div>
            <div className="space-y-3.5">
              {filtered.slice(0, 8).map((p) => <div key={p.id} className="rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4"><div className="flex gap-3"><div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#6C0102] to-[#C7080C] text-2xl">{p.icon}<span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#222B31] bg-[#34D399] text-[10px] font-extrabold text-[#06281c]">✓</span></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><div className="font-bold">{p.name}</div><div className="text-xs text-[#B9C3C9]">{p.skill} · {p.km.toFixed(1)} km · {p.area}</div></div>{p.verified !== false && <span className="text-xs font-bold text-[#34D399]">Verified</span>}</div><div className="my-2 flex flex-wrap gap-1.5"><span className="rounded-full border border-[rgba(245,196,81,0.35)] bg-[rgba(245,196,81,0.12)] px-2 py-1 text-[0.68rem] font-semibold text-[#F5C451]">{p.rate ? `From KSh ${p.rate.toLocaleString()}` : "Quote"}</span><span className="rounded-full bg-white/5 px-2 py-1 text-[0.68rem] text-[#B9C3C9]">{p.available}</span></div><div className="flex items-center justify-between"><span className="text-sm font-bold">★ {p.rating ? p.rating.toFixed(1) : "New"} <span className="font-normal text-[#B9C3C9]">{p.reviews ? `(${p.reviews})` : ""}</span></span><Link href={`/consumer/provider/${p.id}`} className="rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] px-4 py-2 text-xs font-bold text-white">View profile</Link></div></div></div></div>)}
              {filtered.length === 0 && <div className="rounded-[20px] border border-dashed border-white/15 px-4 py-10 text-center text-sm text-[#B9C3C9]">No providers match this search yet.</div>}
            </div>
          </section>
        </div>
      )}

      {activeTab === "for-you" && (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5C451]">Discovery</p><h1 className="mt-1 text-2xl font-extrabold">For You</h1><p className="mt-1 text-sm text-[#B9C3C9]">Discover local work, products and providers worth saving.</p></div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["🪑","Custom furniture","Made-to-order pieces from local makers"],
              ["🚿","Bathroom fittings","Fixtures, repairs and installation"],
              ["🧰","Hardware & tools","Shops and fabricators near you"],
              ["👗","Tailored fashion","Custom clothing and alterations"],
            ].map(([icon,title,desc]) => <button key={title} type="button" onClick={() => { setSearch(title); setTab("home"); }} className="overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] text-left"><div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#1d2b3a] to-[#3b1013] text-5xl">{icon}</div><div className="p-3"><h2 className="text-sm font-extrabold">{title}</h2><p className="mt-1 text-[0.68rem] leading-relaxed text-[#B9C3C9]">{desc}</p><span className="mt-2 block text-[0.65rem] font-bold text-[#F5C451]">Explore →</span></div></button>)}
          </div>
          <div className="mt-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4"><div className="flex items-center gap-3"><span className="text-3xl">▶</span><div><h2 className="font-extrabold">Short videos are coming</h2><p className="mt-1 text-xs leading-relaxed text-[#B9C3C9]">The feed is designed for work-in-progress clips, product demos and finished projects. Likes, saves and hire/order actions will live on the media.</p></div></div></div>
          <div className="mt-4 rounded-[22px] border border-[rgba(245,196,81,0.25)] bg-[rgba(245,196,81,0.06)] p-4"><p className="text-xs leading-relaxed text-[#B9C3C9]"><b className="text-[#F5C451]">Marketplace safety:</b> product publishing will have moderation hooks before goods become publicly discoverable.</p></div>
        </div>
      )}

      {activeTab === "jobs" && (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5C451]">Tracking</p><h1 className="mt-1 text-2xl font-extrabold">Bookings & Jobs</h1><p className="mt-1 text-sm text-[#B9C3C9]">Follow active work, quotes and your service history.</p></div>
          <Link href="/bookings" className="mb-4 flex items-center justify-between rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4"><div><b className="text-sm">Open full bookings</b><p className="mt-1 text-xs text-[#B9C3C9]">Reviews, receipts and full booking details</p></div><span className="text-[#F5C451]">→</span></Link>
          {filtered.slice(0, 3).map((p, i) => <div key={p.id} className="mb-3 rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4"><div className="flex justify-between gap-3"><div><b>{p.name}</b><p className="text-xs text-[#B9C3C9]">{p.skill} · #{String(1042+i)}</p></div><span className="rounded-full bg-[#F5C451]/10 px-2.5 py-1 text-[0.62rem] font-bold text-[#F5C451]">Quote ready</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#E22227] to-[#F5C451]" style={{ width: `${progress(i === 0 ? "accepted" : "requested")}%` }} /></div><div className="mt-2 flex justify-between text-[0.62rem] text-[#7F8C93]"><span>Requested</span><span>Quote accepted</span><span>En route</span><span>Done</span></div></div>)}
          <div className="rounded-[20px] border border-dashed border-white/10 p-6 text-center"><p className="text-2xl">🧾</p><p className="mt-2 text-sm font-bold">Pending quotes</p><p className="mt-1 text-xs text-[#B9C3C9]">Provider quotes will appear here with approve, decline and milestone-payment actions.</p></div>
        </div>
      )}

      {activeTab === "messages" && (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5C451]">Inbox</p><h1 className="mt-1 text-2xl font-extrabold">Messages & Payments</h1><p className="mt-1 text-sm text-[#B9C3C9]">Keep provider conversations and transaction updates together.</p></div>
          <div className="mb-3 flex rounded-full bg-white/5 p-1"><button className="flex-1 rounded-full bg-white/10 py-2 text-xs font-bold">Service enquiries</button><button className="flex-1 py-2 text-xs font-bold text-[#7F8C93]">Product orders</button></div>
          <div className="space-y-3"><div className="rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E22227]/15">🔧</span><div className="flex-1"><b className="text-sm">Provider conversations</b><p className="mt-1 text-xs text-[#B9C3C9]">Quote requests, job updates and photos will appear here.</p></div><span className="text-[#F5C451]">›</span></div></div><div className="rounded-[20px] border border-[rgba(245,196,81,0.25)] bg-[rgba(245,196,81,0.06)] p-4"><div className="flex justify-between"><div><p className="text-xs text-[#B9C3C9]">SAVIS Wallet</p><p className="mt-1 text-xl font-extrabold">KSh 0</p></div><span className="text-2xl">💳</span></div><p className="mt-2 text-[0.68rem] text-[#7F8C93]">M-Pesa, saved cards and escrow milestones will connect here.</p></div><Link href="/messages" className="block text-center text-xs font-bold text-[#F5C451]">Open messaging hub →</Link></div>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <div className="mb-5 flex items-center gap-4 rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] text-2xl font-black">{firstName.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><h1 className="text-xl font-extrabold truncate">{profile?.full_name || "Account"}</h1><p className="truncate text-xs text-[#B9C3C9]">{profile?.email}</p><span className="mt-1 inline-block rounded-full bg-[#F5C451]/10 px-2 py-1 text-[0.6rem] font-bold text-[#F5C451] capitalize">{profile?.role || "consumer"}</span></div></div>
          <div className="space-y-2"><Link href="/profile" className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4 text-sm font-bold">Account & Security <span>→</span></Link><Link href="/settings" className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4 text-sm font-bold">Settings & notifications <span>→</span></Link><button type="button" onClick={() => setShowTutorial(true)} className="flex w-full items-center justify-between rounded-[18px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4 text-sm font-bold">App tutorial <span>?</span></button><button type="button" onClick={() => setTab("for-you")} className="flex w-full items-center justify-between rounded-[18px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4 text-sm font-bold">Saved & favorites <span>♡</span></button></div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-center rounded-full border border-white/10 bg-[rgba(34,43,49,0.94)] px-1 py-2 shadow-2xl backdrop-blur-lg">
          {tabItems.map((tab) => <button key={tab.id} type="button" onClick={() => setTab(tab.id)} className={`flex flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[0.58rem] font-bold transition ${activeTab === tab.id ? "bg-gradient-to-br from-[#E22227] to-[#C7080C] text-white" : "text-[#B9C3C9]"}`}><span className="text-base">{tab.icon}</span>{tab.label}</button>)}
        </div>
      </nav>

      {mapMode && (
        <div className="fixed inset-0 z-50 bg-[#0b1116]">
          <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#11171c]/90 px-4 py-3 backdrop-blur-xl"><div><b className="text-sm">Live SAVIS map</b><p className="text-[0.62rem] text-[#B9C3C9]">Within {radius} km · {filtered.length} results</p></div><button type="button" onClick={() => setMapMode(false)} className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold">Close</button></div>
          <iframe title="SAVIS full-screen map" src={mapUrl} className="h-full w-full border-0" />
          <div className="absolute bottom-6 left-4 right-4 z-20 flex gap-2 overflow-x-auto pb-1">{filtered.slice(0, 5).map((p) => <Link key={p.id} href={`/consumer/provider/${p.id}`} className="min-w-[210px] rounded-[18px] border border-white/10 bg-[#11171c]/90 p-3 backdrop-blur-xl"><div className="flex items-center gap-2"><span className="text-2xl">{p.icon}</span><div className="min-w-0"><b className="block truncate text-sm">{p.name}</b><span className="text-[0.62rem] text-[#B9C3C9]">{p.skill} · {p.km.toFixed(1)} km</span></div></div><div className="mt-2 text-xs font-bold text-[#F5C451]">★ {p.rating || "New"} · View profile →</div></Link>)}</div>
        </div>
      )}

      {showTutorial && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-[26px] border border-white/10 bg-[#182127] p-5 shadow-2xl">
            <div className="flex items-center justify-between"><div><span className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5C451]">SAVIS guide</span><h2 className="mt-1 text-xl font-extrabold">Everything in five tabs</h2></div><button onClick={() => setShowTutorial(false)} className="text-xl text-[#B9C3C9]">×</button></div>
            <div className="mt-5 space-y-3">
              <p className="rounded-2xl bg-white/5 p-3 text-sm"><b>Home</b> — search, categories, nearby providers and map.</p>
              <p className="rounded-2xl bg-white/5 p-3 text-sm"><b>For You</b> — discover local products, work and future short videos.</p>
              <p className="rounded-2xl bg-white/5 p-3 text-sm"><b>Jobs</b> — track requests, quotes and service progress.</p>
              <p className="rounded-2xl bg-white/5 p-3 text-sm"><b>Messages</b> — provider conversations and future payment controls.</p>
              <p className="rounded-2xl bg-white/5 p-3 text-sm"><b>Profile</b> — security, settings, notifications and saved providers.</p>
            </div>
            <button type="button" onClick={() => setShowTutorial(false)} className="mt-5 w-full rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] py-3 text-sm font-bold">Got it</button>
          </div>
        </div>
      )}
    </main>
  );
}
