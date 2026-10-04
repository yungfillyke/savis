"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AccountMenu from "@/components/AccountMenu";
import LangToggle from "@/components/LangToggle";
import { t, getLang, setLang, type Lang } from "@/lib/i18n";
import { distanceKm, getSavedLocation, requestCurrentLocation, type UserLocation } from "@/lib/location";
import { syncConsumerBookings, type Booking } from "@/lib/bookings";
import SavisMap, { type SavisMapProvider } from "@/components/SavisMap";
import { getOrCreateConversation, listConversations, sendMessage, subscribeToConversations, type Conversation } from "@/lib/messaging";
import SavisOnboarding from "@/components/SavisOnboarding";

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
  avatarUrl?: string;
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
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedMapProvider, setSelectedMapProvider] = useState<SavisMapProvider | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageBusy, setMessageBusy] = useState(false);

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
        p_radius_km: radius,
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
      .select("id, full_name, role, avatar_url, latitude, longitude, location_name, service_category, hourly_rate, rating, review_count, availability, verified, verification_status, bio")
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
      })).filter((row) => (!categoryArg || String(row.service_category || "").toLowerCase() === categoryArg.toLowerCase()) && (!location || Number(row.distance_km) <= radius));

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
  }, [loading, userLocation, activeCategory, radius]);

  useEffect(() => {
    if (!loading) void syncConsumerBookings().then(setBookings);
  }, [loading]);

  useEffect(() => {
    if (loading || activeTab !== "messages") return;
    void listConversations().then(setConversations);
    return subscribeToConversations((conversation) => {
      setConversations((current) => {
        const next = current.filter((item) => item.id !== conversation.id);
        return [conversation, ...next].sort((a,b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
      });
    });
  }, [loading, activeTab]);

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
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [providers, search, activeCategory]);

  const firstName = profile?.full_name?.split(" ")[0] || "Friend";
  const mapCenter = userLocation || { latitude: -1.2864, longitude: 36.8172 };

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
    requested: 18, quote_pending: 30, accepted: 48, en_route: 68,
    in_progress: 84, completed: 100, declined: 0, cancelled: 0, rescheduled: 32,
  }[status] ?? 18);

  return (
    <main className="savis-internal min-h-screen pb-28">
      <header className="sticky top-0 z-40 border-b border-white/10 savis-platinum px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <button type="button" onClick={() => setTab("profile")} aria-label="Open account menu" className="text-xl font-black tracking-tight">SAVIS</button>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setMapMode(true)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.68rem] font-bold text-[#B9C3C9]">🗺 Map</button>
            <button type="button" onClick={() => setShowTutorial(true)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 font-black">?</button>
            <AccountMenu name={profile?.full_name || "Account"} role={profile?.role || "consumer"} homeHref="/consumer" />
          </div>
        </div>
      </header>

      {activeTab === "home" && (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <section className="mb-5 rounded-[24px] border border-white/10 savis-platinum p-4">
            <p className="text-sm text-[#B9C3C9]">{t("welcome.back", lang)}</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div><h1 className="text-2xl font-extrabold tracking-tight">Hi, {firstName} 👋</h1><p className="mt-1 text-sm text-[#B9C3C9]">What do you need help with today?</p></div>
              <button type="button" onClick={() => setTab("profile")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] text-sm font-extrabold">{firstName.charAt(0).toUpperCase()}</button>
            </div>
          </section>

          <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="SAVIS overview">
            {[
              ["⌂", String(filtered.length), "Nearby providers"],
              ["★", "4.8", "Average rating"],
              ["✓", String(filtered.filter((p) => p.verified).length), "Verified nearby"],
              ["KSh", filtered.length ? Math.min(...filtered.map((p) => p.rate || 0)).toLocaleString() : "—", "Lowest starting rate"],
            ].map(([icon, value, label]) => (
              <article key={label} className="savis-stat-card">
                <div className="savis-stat-icon">{icon}</div>
                <p className="mt-3 text-xl font-black tracking-tight">{value}</p>
                <p className="mt-1 text-[0.68rem] font-semibold text-[#66717D]">{label}</p>
              </article>
            ))}
          </section>

          <section className="mb-4">
            <div className="flex gap-2 rounded-full bg-white p-1.5 shadow-xl">
              <div id="savis-search"><input value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-full px-4 py-3 text-[0.95rem] text-[#222B31] outline-none" placeholder="Search services, providers or shops…" /></div>
              <button type="button" onClick={() => document.getElementById("nearby-results")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] px-5 py-3 text-sm font-bold text-white">Search</button>
            </div>
            <div className="mt-3 flex items-center gap-2 px-1">
              <span className="text-[#B9C3C9]">📍</span><span className="min-w-0 flex-1 truncate text-sm text-[#B9C3C9]">{userLocation ? "Current location" : "Nairobi"}</span>
              <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="rounded-full border border-white/10 bg-[#222B31] px-3 py-1.5 text-xs font-bold outline-none"><option value={5}>Within 5 km</option><option value={10}>Within 10 km</option><option value={25}>Within 25 km</option><option value={50}>Within 50 km</option></select>
              <button type="button" onClick={enableLocation} disabled={locationBusy} className="text-xs font-bold text-[#F5C451]">{locationBusy ? "…" : "Use my location"}</button>
            </div>
            {locationMessage && <p className="mt-2 px-1 text-xs text-[#B9C3C9]">{locationMessage}</p>}
          </section>

          <section className="mb-5 overflow-hidden rounded-[20px] border border-[rgba(245,196,81,0.28)] bg-gradient-to-br from-[rgba(108,1,2,0.92)] to-[#090a0c] p-4"><div className="mb-3 flex items-center justify-between"><div><span className="text-[0.65rem] font-extrabold uppercase tracking-wider text-[#F5C451]">Sponsored</span><h2 className="mt-1 text-lg font-extrabold">Local businesses on SAVIS</h2></div><span className="text-[0.62rem] text-[#B9C3C9]">Auto-scroll →</span></div><div className="overflow-hidden"><div className="savis-auto-track"><div className="savis-horizontal-card savis-platinum rounded-2xl p-4"><b>Kahawa Fresh</b><p className="mt-1 text-xs text-[#B9C3C9]">Fresh roasted Kenyan coffee around Nairobi.</p></div><div className="savis-horizontal-card savis-platinum rounded-2xl p-4"><b>Mali Home Decor</b><p className="mt-1 text-xs text-[#B9C3C9]">Handcrafted Kenyan pieces for a warmer home.</p></div><div className="savis-horizontal-card savis-platinum rounded-2xl p-4"><b>SwiftFix Appliances</b><p className="mt-1 text-xs text-[#B9C3C9]">Reliable appliance repair from verified technicians.</p></div><div className="savis-horizontal-card savis-platinum rounded-2xl p-4"><b>Nia Beauty Studio</b><p className="mt-1 text-xs text-[#B9C3C9]">Beauty appointments near you.</p></div><div className="savis-horizontal-card savis-platinum rounded-2xl p-4"><b>Green Basket</b><p className="mt-1 text-xs text-[#B9C3C9]">Farm-fresh produce and household essentials.</p></div><div className="savis-horizontal-card rounded-2xl border border-[#F5C451]/30 bg-gradient-to-br from-[#6c0102] to-[#12090a] p-4"><b className="text-[#F5C451]">Advertise with SAVIS</b><p className="mt-1 text-xs text-white/70">Put your business in front of local customers.</p></div></div></div></section>

          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold text-lg">Categories</h2><span className="text-xs text-[#B9C3C9]">17 service types</span></div>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.slice(0, 12).map(([id, name, icon]) => <button key={id} type="button" onClick={() => { setActiveCategory(id); setTab("home"); }} className={`rounded-2xl border p-2.5 text-center transition ${activeCategory === id ? "border-[#E22227] bg-[rgba(226,34,39,0.2)]" : "border-white/10 bg-[rgba(34,43,49,0.72)]"}`}><span className="block text-xl">{icon}</span><span className="mt-1 block truncate text-[0.65rem] font-bold text-[#B9C3C9]">{name}</span></button>)}
            </div>
            <button type="button" onClick={() => setShowTutorial(true)} className="mt-3 text-xs font-bold text-[#F5C451]">How SAVIS works →</button>
          </section>

          <section id="savis-map" className="mb-6 overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
            <div className="flex items-center justify-between gap-3 px-4 pt-4"><div><h2 className="font-extrabold text-lg">Live nearby</h2><p className="mt-0.5 text-xs text-[#B9C3C9]">{realProviders ? `Providers within ${radius} km` : "Alpha sample providers"}</p></div><button type="button" onClick={() => setMapMode(true)} className="text-xs font-bold text-[#F5C451]">Open live map →</button></div>
            <div className="relative mt-4 overflow-hidden border-y border-white/10">
              <SavisMap center={mapCenter} providers={filtered} radiusKm={radius} selectedProviderId={selectedMapProvider?.id || null} onSelect={setSelectedMapProvider} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#11171c]/35 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-[#11171c]/85 px-3 py-1.5 text-[0.65rem] font-bold backdrop-blur">● {filtered.length} nearby results</div>
            </div>
            <p className="px-4 py-3 text-[0.62rem] text-[#55666E]">Live provider pins · pan · pinch/scroll zoom · tap a provider for a quick card.</p>
            {selectedMapProvider && <div className="mx-4 mb-4 rounded-2xl border border-[rgba(245,196,81,0.3)] bg-black/25 p-3"><div className="flex items-center justify-between gap-3"><div><b>{selectedMapProvider.name}</b><p className="text-xs text-[#B9C3C9]">{selectedMapProvider.skill} · {selectedMapProvider.km.toFixed(1)} km · ★ {selectedMapProvider.rating ? selectedMapProvider.rating.toFixed(1) : "New"}</p></div><Link href={`/consumer/provider/${selectedMapProvider.id}`} className="rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] px-3 py-2 text-xs font-bold">View / quote</Link></div><p className="mt-2 text-xs text-[#B9C3C9]">{selectedMapProvider.rate ? `From KSh ${selectedMapProvider.rate.toLocaleString()}` : "Instant quote available"} · response time shown on provider profile.</p></div>}
          </section>

          <section id="nearby-results" className="mb-6">
            <div className="mb-3 flex items-center justify-between"><div><h2 className="font-extrabold text-lg">{search || activeCategory !== "all" ? `Results (${filtered.length})` : "People near you"}</h2><p className="mt-0.5 text-xs text-[#B9C3C9]">{providerMessage || "Trusted local providers"}</p></div>{(search || activeCategory !== "all") && <button type="button" onClick={() => { setSearch(""); setActiveCategory("all"); }} className="text-xs font-bold text-[#F5C451]">Clear</button>}</div>
            <div className="space-y-2.5">
              {filtered.slice(0, 8).sort((a,b) => a.name.localeCompare(b.name)).map((p) => <div key={p.id} className="savis-contact-row"><div className="flex gap-3"><div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-[#6C0102] to-[#C7080C] text-2xl">{p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : p.icon}<span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#222B31] bg-[#34D399] text-[10px] font-extrabold text-[#06281c]">✓</span></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><div className="font-bold">{p.name}</div><div className="text-xs text-[#B9C3C9]">{p.skill} · {p.km.toFixed(1)} km · {p.area}</div></div>{p.verified !== false && <span className="text-xs font-bold text-[#34D399]">Verified</span>}</div><div className="my-2 flex flex-wrap gap-1.5"><span className="rounded-full border border-[rgba(245,196,81,0.35)] bg-[rgba(245,196,81,0.12)] px-2 py-1 text-[0.68rem] font-semibold text-[#F5C451]">{p.rate ? `From KSh ${p.rate.toLocaleString()}` : "Quote"}</span><span className="rounded-full bg-white/5 px-2 py-1 text-[0.68rem] text-[#B9C3C9]">{p.available}</span></div><div className="flex items-center justify-between"><span className="text-sm font-bold">★ {p.rating ? p.rating.toFixed(1) : "New"} <span className="font-normal text-[#B9C3C9]">{p.reviews ? `(${p.reviews})` : ""}</span></span><Link href={`/consumer/provider/${p.id}`} className="rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] px-4 py-2 text-xs font-bold text-white">View profile</Link></div></div></div></div>)}
              {filtered.length === 0 && <div className="rounded-[20px] border border-dashed border-white/15 px-4 py-10 text-center text-sm text-[#B9C3C9]">No providers match this search yet.</div>}
            </div>
          </section>
        </div>
      )}

      {activeTab === "for-you" && (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5C451]">Discovery</p><h1 className="mt-1 text-2xl font-extrabold">For You</h1><p className="mt-1 text-sm text-[#B9C3C9]">Discover local work, products and providers worth saving.</p></div>
          <div className="savis-discovery-grid grid grid-cols-2 gap-3">
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

      {activeTab === "messages" && (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5C451]">Inbox & payments</p><h1 className="mt-1 text-2xl font-extrabold">Messages</h1><p className="mt-1 text-sm text-[#B9C3C9]">Service enquiries, quote alerts and payment updates stay together.</p></div>
          <div className="savis-inbox-tabs mb-4 grid grid-cols-3 gap-2">{[["💬","Enquiries","Provider chats"],["💳","Payments","M-Pesa / wallet"],["🔔","Alerts","Quotes & milestones"]].map(([icon,title,desc]) => <button key={title} type="button" className="rounded-2xl border border-white/10 bg-[rgba(34,43,49,0.72)] p-3 text-left"><span className="text-xl">{icon}</span><b className="mt-2 block text-xs">{title}</b><span className="mt-1 block text-[0.62rem] text-[#B9C3C9]">{desc}</span></button>)}</div>
          <div className="savis-inbox-panel rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4"><div className="flex items-center justify-between"><b>Recent activity</b><span className="text-[0.65rem] text-[#34D399]">Secure foundation</span></div>
            {bookings.slice(0,4).map((b) => <div key={b.id} className="mt-3 rounded-2xl bg-black/20 p-3"><div className="flex justify-between gap-3"><div><b className="text-sm">{b.providerName}</b><p className="text-xs text-[#B9C3C9]">{b.skill} · {b.description.slice(0,48)}</p></div><span className="text-xs text-[#F5C451] capitalize">{b.status.replace("_"," ")}</span></div><div className="mt-2 flex gap-2"><Link href={`/consumer/provider/${b.providerId}`} className="rounded-full bg-white/5 px-3 py-1.5 text-[0.65rem] font-bold">Open provider</Link><button type="button" disabled={messageBusy} onClick={async () => {
  setMessageBusy(true);
  const conversation = await getOrCreateConversation(b.providerId, b.id);
  if (conversation) {
    await sendMessage(conversation.id, "Hello, I would like an update on my SAVIS job.");
    setMessageText("Hello, I would like an update on my SAVIS job.");
    setMessageSent(true);
    setConversations(await listConversations());
  }
  setMessageBusy(false);
}} className="rounded-full bg-white/5 px-3 py-1.5 text-[0.65rem] font-bold">{messageBusy ? "Sending…" : "Message"}</button></div></div>)}
            {conversations.length > 0 && <div className="mt-3 border-t border-white/10 pt-3"><p className="text-[0.65rem] font-bold text-[#B9C3C9]">Conversations</p>{conversations.slice(0,4).map((conversation) => <div key={conversation.id} className="mt-2 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><span className="text-xs">Provider · {conversation.providerId.slice(0,8)}…</span><span className="text-[0.6rem] text-[#7F8C93]">{new Date(conversation.lastMessageAt).toLocaleString()}</span></div>)}</div>}
            {bookings.length===0 && conversations.length===0 && <div className="mt-3 rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-[#B9C3C9]">Your provider conversations and payment alerts will appear here.</div>}
          </div>
          {messageSent && <div className="mt-3 rounded-2xl border border-[#34D399]/20 bg-[#34D399]/5 p-3"><p className="text-xs text-[#B9C3C9]">Live message delivery is wired to the production messaging foundation after the SQL migration. Draft: <b className="text-white">{messageText}</b></p></div>}
        </div>
      )}

      {activeTab === "profile" && (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5C451]">Account & security</p><h1 className="mt-1 text-2xl font-extrabold">Profile</h1><p className="mt-1 text-sm text-[#B9C3C9]">Your identity, saved providers and security controls.</p></div>
          <div className="savis-profile-hero rounded-[22px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4 mb-3"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] text-xl font-black">{firstName.charAt(0).toUpperCase()}</div><div><b className="text-lg">{profile?.full_name || firstName}</b><p className="text-xs text-[#B9C3C9]">{profile?.email || "SAVIS consumer"} · Consumer</p></div></div></div>
          <div className="savis-profile-menu space-y-2">{[["⚙️","Settings","Appearance, language, notifications and location","/settings"],["🔐","Security","Password, 2FA and device management","/settings"],["❤️","Saved providers","Favorites and trusted providers","/profile"],["📋","Bookings & receipts","History, reviews and receipts","/bookings"]].map(([icon,title,desc,href]) => <Link key={title} href={href} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(34,43,49,0.72)] p-4"><span className="text-xl">{icon}</span><span className="min-w-0 flex-1"><b className="block text-sm">{title}</b><span className="block mt-1 text-xs text-[#B9C3C9]">{desc}</span></span><span className="text-[#F5C451]">→</span></Link>)}</div>
          <div className="mt-4 rounded-[22px] border border-[rgba(245,196,81,0.25)] bg-[rgba(245,196,81,0.06)] p-4"><b className="text-sm text-[#F5C451]">SAVIS Wallet</b><p className="mt-1 text-xs text-[#B9C3C9]">The current wallet is prototype/local. The production payments ledger is prepared for M-Pesa and escrow integration.</p></div>
        </div>
      )}

      {activeTab === "jobs" && (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5C451]">Tracking</p><h1 className="mt-1 text-2xl font-extrabold">Bookings & Jobs</h1><p className="mt-1 text-sm text-[#B9C3C9]">Follow active work, quotes and your service history.</p></div>
          <Link href="/bookings" className="savis-job-link mb-4 flex items-center justify-between rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4"><div><b className="text-sm">Open full bookings</b><p className="mt-1 text-xs text-[#B9C3C9]">Reviews, receipts and full booking details</p></div><span className="text-[#F5C451]">→</span></Link>
          {bookings.slice(0, 3).map((booking) => (
            <div key={booking.id} className="savis-job-card mb-3 rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4">
              <div className="flex justify-between gap-3"><div><b>{booking.providerName}</b><p className="text-xs text-[#B9C3C9]">{booking.skill} · #SV-{booking.id.slice(-4)}</p></div><span className="rounded-full bg-[#F5C451]/10 px-2.5 py-1 text-[0.62rem] font-bold text-[#F5C451] capitalize">{booking.status}</span></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#E22227] to-[#F5C451]" style={{ width: `${progress(booking.status)}%` }} /></div>
              <div className="mt-2 flex justify-between text-[0.62rem] text-[#7F8C93]"><span>Requested</span><span>Accepted</span><span>En route</span><span>Done</span></div>
            </div>
          ))}
          {bookings.length === 0 && <div className="rounded-[20px] border border-dashed border-white/10 p-6 text-center"><p className="text-2xl">🧾</p><p className="mt-2 text-sm font-bold">No active jobs yet</p><p className="mt-1 text-xs text-[#B9C3C9]">When you request a provider, live job progress will appear here.</p></div>}
        </div>
      )}
      <SavisOnboarding open={showTutorial} onClose={() => setShowTutorial(false)} />
      {mapMode && (
        <div className="fixed inset-0 z-[70] bg-[#11171c]">
          <SavisMap center={mapCenter} providers={filtered} fullScreen radiusKm={radius} selectedProviderId={selectedMapProvider?.id || null} onSelect={setSelectedMapProvider} />
          <div className="absolute left-4 right-4 top-4 z-[90] flex items-center justify-between gap-2"><div className="rounded-full border border-white/10 bg-[#11171c]/90 px-4 py-2 text-sm font-bold backdrop-blur">SAVIS · Live map</div><button type="button" onClick={() => setMapMode(false)} className="rounded-full border border-white/10 bg-[#11171c]/90 px-4 py-2 text-sm font-bold backdrop-blur">Close ✕</button></div>
          <div className="absolute bottom-6 left-4 right-4 z-[90] rounded-[22px] border border-white/10 bg-[#11171c]/92 p-3 backdrop-blur"><div className="flex items-center justify-between"><div><b>{filtered.length} providers in view</b><p className="text-xs text-[#B9C3C9]">Radius: {radius} km · tap a pin for quick details</p></div><button type="button" onClick={enableLocation} className="rounded-full bg-[#F5C451] px-3 py-2 text-xs font-black text-[#141B1F]">Recenter</button></div>{selectedMapProvider && <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-3"><div><b className="text-sm">{selectedMapProvider.name}</b><p className="text-xs text-[#B9C3C9]">{selectedMapProvider.skill} · ★ {selectedMapProvider.rating ? selectedMapProvider.rating.toFixed(1) : "New"} · {selectedMapProvider.km.toFixed(1)} km</p></div><Link href={`/consumer/provider/${selectedMapProvider.id}`} className="rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] px-3 py-2 text-xs font-bold">View</Link></div>}</div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[rgba(17,23,28,0.94)] px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {tabItems.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-2xl px-2 py-2 text-center transition ${activeTab===item.id ? "bg-white/10 text-white" : "text-[#7F8C93]"}`}><span className="block text-lg leading-none">{item.icon}</span><span className="mt-1 block text-[0.62rem] font-bold">{item.label}</span></button>)}
        </div>
      </nav>
    </main>
  );
}
