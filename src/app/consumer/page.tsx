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
  ["all", "All", "✨"], ["Plumbing", "Plumbing", "🔧"], ["Masonry", "Masonry", "🧱"],
  ["Electrical", "Electrical", "⚡"], ["Tailoring", "Tailoring", "🧵"], ["Cleaning", "Cleaning", "🧹"],
  ["Carpentry", "Carpentry", "🪚"], ["Painting", "Painting", "🎨"], ["Photography", "Photography", "📷"],
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
        p_lat: location.latitude, p_lng: location.longitude, p_radius_km: 25, p_category: categoryArg, p_limit: 40,
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
      .not("latitude", "is", null).not("longitude", "is", null).limit(40);

    if (!result.error && result.data?.length) {
      const rows = result.data.map((row) => ({
        ...row,
        distance_km: location && row.latitude != null && row.longitude != null
          ? distanceKm(location, { latitude: Number(row.latitude), longitude: Number(row.longitude) }) : 0,
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
      if (user) await supabase.from("profiles").update({
        latitude: location.latitude, longitude: location.longitude, location_name: "Current location",
      }).eq("id", user.id);
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

  return (
    <main className="min-h-screen bg-[#182126] pb-28">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#182126]/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link href="/consumer" aria-label="SAVIS home" className="text-xl font-black tracking-[-0.04em]">SAVIS<span className="text-[#E22227]">.</span></Link>
          <div className="flex items-center gap-2"><LangToggle lang={lang} onChange={switchLang} /><AccountMenu name={profile?.full_name || "Account"} role={profile?.role || "consumer"} homeHref="/consumer" /></div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pt-5">
        <section className="relative mb-5 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#3b0809] via-[#252f35] to-[#1d272d] p-5 shadow-xl">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#E22227]/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#B9C3C9]">Good to see you, {firstName}</p>
                <h1 className="mt-1 max-w-md text-2xl font-black tracking-tight sm:text-3xl">Find trusted help, close to you.</h1>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#D1D8DC]">Discover local providers, compare services and book help when you need it.</p>
              </div>
              <Link href="/profile" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-black">{firstName.charAt(0).toUpperCase()}</Link>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-2xl">
              <span className="pl-3 text-lg">⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && document.getElementById("nearby-results")?.scrollIntoView({ behavior: "smooth" })} className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm font-medium text-[#222B31] outline-none" placeholder={t("search.placeholder", lang)} />
              <button type="button" onClick={() => document.getElementById("nearby-results")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl bg-[#E22227] px-4 py-3 text-xs font-black text-white shadow-lg">Search</button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm text-[#D1D8DC]"><span>📍</span><span className="truncate">{userLocation ? "Current location" : "Nairobi"}</span></div>
              <button type="button" onClick={enableLocation} disabled={locationBusy} className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#F5C451]">{locationBusy ? "Locating…" : "Use my location"}</button>
            </div>
            {locationMessage && <p className="mt-2 text-xs text-[#B9C3C9]">{locationMessage}</p>}
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-black">What do you need?</h2><p className="mt-0.5 text-xs text-[#7f8d94]">Popular services on SAVIS</p></div><button type="button" onClick={() => setActiveCategory("all")} className="text-xs font-bold text-[#F5C451]">View all</button></div>
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
            {CATEGORIES.slice(1).map(([id, name, icon]) => (
              <button key={id} type="button" onClick={() => { setActiveCategory(id); document.getElementById("nearby-results")?.scrollIntoView({ behavior: "smooth" }); }} className={`group flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center transition ${activeCategory === id ? "border-[#E22227] bg-[#E22227]/15" : "border-white/8 bg-[#222b31]/70 hover:border-white/20"}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-lg transition group-hover:scale-105">{icon}</span><span className="text-[0.68rem] font-bold text-[#D5DCE0]">{name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6 overflow-hidden rounded-[22px] border border-[#F5C451]/20 bg-gradient-to-r from-[#321719] to-[#242d32]">
          <div className="flex items-center justify-between gap-4 p-4">
            <div><span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#F5C451]">Sponsored</span><h2 className="mt-1 text-sm font-black">Grow your local business with SAVIS</h2><p className="mt-1 text-xs leading-5 text-[#AEB9BE]">Reach nearby customers looking for services and shops.</p></div>
            <button type="button" className="shrink-0 rounded-full bg-white px-3 py-2 text-[0.68rem] font-black text-[#6C0102]">Learn more</button>
          </div>
        </section>

        <section className="mb-6 overflow-hidden rounded-[22px] border border-white/10 bg-[#222b31]/75">
          <div className="flex items-center justify-between gap-3 px-4 pt-4"><div><h2 className="font-black">Around you</h2><p className="mt-1 text-xs text-[#849198]">{realProviders ? "Live SAVIS provider discovery" : userLocation ? "Centered on your current location" : "Nairobi area — enable location for a closer view"}</p></div><a href={`https://www.openstreetmap.org/?mlat=${mapCenter.latitude}&mlon=${mapCenter.longitude}#map=13/${mapCenter.latitude}/${mapCenter.longitude}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#F5C451]">Open ↗</a></div>
          <div className="mt-4 border-y border-white/8"><iframe title="SAVIS nearby map" src={mapUrl} className="h-56 w-full border-0" loading="lazy" /></div>
          <p className="px-4 py-2.5 text-[0.62rem] text-[#65737A]">Map data © OpenStreetMap contributors.</p>
        </section>

        <section id="nearby-results" className="mb-7">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 className="text-lg font-black">{search || activeCategory !== "all" ? `Results · ${filtered.length}` : "People near you"}</h2><p className="mt-1 text-xs text-[#849198]">{providerMessage || "Trusted local providers"}</p></div>
            {(search || activeCategory !== "all") && <button type="button" onClick={() => { setSearch(""); setActiveCategory("all"); }} className="shrink-0 text-xs font-bold text-[#F5C451]">Clear</button>}
          </div>
          <div className="space-y-3">
            {filtered.length === 0 ? <div className="rounded-[22px] border border-dashed border-white/15 bg-[#222b31]/50 px-4 py-12 text-center"><div className="text-2xl">🔎</div><p className="mt-2 text-sm font-bold">No matching providers yet</p><p className="mt-1 text-xs text-[#849198]">Try another service or search term.</p></div> : filtered.map((p) => (
              <article key={p.id} className="rounded-[22px] border border-white/8 bg-[#222b31]/75 p-4 transition hover:border-white/15">
                <div className="flex gap-3">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C0102] to-[#C7080C] text-2xl shadow-lg">{p.icon}{p.verified !== false && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#222b31] bg-[#34D399] text-[9px] font-black text-[#06281c]">✓</span>}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-black">{p.name}</h3><p className="mt-0.5 text-xs text-[#AEB9BE]">{p.skill} · {p.km.toFixed(1)} km · {p.area}</p></div>{p.verified !== false && <span className="shrink-0 rounded-full bg-[#34D399]/10 px-2 py-1 text-[0.62rem] font-bold text-[#67E8B1]">Verified</span>}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-full bg-[#F5C451]/10 px-2.5 py-1 text-[0.68rem] font-bold text-[#F5C451]">{p.rate ? `${t("from.ksh", lang)} ${p.rate.toLocaleString()}` : "Rate on request"}</span><span className="rounded-full bg-white/6 px-2.5 py-1 text-[0.68rem] font-semibold text-[#AEB9BE]">{p.available}</span></div>
                    <div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs font-bold">★ {p.rating ? p.rating.toFixed(1) : "New"} <span className="font-normal text-[#849198]">{p.reviews ? `(${p.reviews})` : ""}</span></span><Link href={`/consumer/provider/${p.id}`} className="rounded-full bg-[#E22227] px-4 py-2 text-[0.68rem] font-black text-white">View profile</Link></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-3"><h2 className="text-lg font-black">Explore more</h2><p className="mt-1 text-xs text-[#849198]">Quick ways to find what you need.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => { setActiveCategory("Electrical"); document.getElementById("nearby-results")?.scrollIntoView({ behavior: "smooth" }); }} className="rounded-[20px] border border-white/8 bg-[#222b31]/75 p-4 text-left transition hover:border-white/15"><span className="text-xl">⚡</span><h3 className="mt-2 text-sm font-black">Electrical help</h3><p className="mt-1 text-xs leading-5 text-[#849198]">Find electricians around your selected location.</p><span className="mt-3 inline-block text-xs font-black text-[#F5C451]">Explore →</span></button>
            <button type="button" onClick={() => { setActiveCategory("Cleaning"); document.getElementById("nearby-results")?.scrollIntoView({ behavior: "smooth" }); }} className="rounded-[20px] border border-white/8 bg-[#222b31]/75 p-4 text-left transition hover:border-white/15"><span className="text-xl">🧹</span><h3 className="mt-2 text-sm font-black">Home cleaning</h3><p className="mt-1 text-xs leading-5 text-[#849198]">Find available cleaners near your selected location.</p><span className="mt-3 inline-block text-xs font-black text-[#F5C451]">Explore →</span></button>
          </div>
        </section>

        <p className="pb-3 text-center text-[0.62rem] leading-relaxed text-[#59676E]">SAVIS Alpha · Local services, discovered nearby.</p>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-lg items-center justify-around rounded-full border border-white/10 bg-[#182126]/92 px-1 py-2 shadow-2xl backdrop-blur-xl">
          <Link href="/consumer" className="flex flex-col items-center gap-0.5 rounded-full bg-[#E22227] px-4 py-1.5 text-[0.62rem] font-black text-white"><span className="text-base">⌂</span>Home</Link>
          <button type="button" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); document.querySelector<HTMLInputElement>("input")?.focus(); }} className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-[0.62rem] font-bold text-[#AEB9BE]"><span className="text-base">⌕</span>Search</button>
          <Link href="/bookings" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-[0.62rem] font-bold text-[#AEB9BE]"><span className="text-base">▣</span>Bookings</Link>
          <Link href="/messages" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-[0.62rem] font-bold text-[#AEB9BE]"><span className="text-base">◌</span>Messages</Link>
          <Link href="/profile" className="hidden flex-col items-center gap-0.5 px-4 py-1.5 text-[0.62rem] font-bold text-[#AEB9BE] sm:flex"><span className="text-base">◉</span>Profile</Link>
        </div>
      </nav>
    </main>
  );
}
