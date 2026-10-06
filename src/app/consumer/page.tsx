"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AccountMenu from "@/components/AccountMenu";
import Logo from "@/components/Logo";
import LangToggle from "@/components/LangToggle";
import { t, getLang, setLang, type Lang } from "@/lib/i18n";
import { distanceKm, getSavedLocation, requestCurrentLocation, type UserLocation } from "@/lib/location";
import { syncConsumerBookings, type Booking } from "@/lib/bookings";
import SavisMap, { type SavisMapProvider } from "@/components/SavisMap";
import { getOrCreateConversation, listConversations, sendMessage, subscribeToConversations, type Conversation } from "@/lib/messaging";
import SavisOnboarding from "@/components/SavisOnboarding";
import CategoryStrip from "@/components/CategoryStrip";
import ForYouOnboarding from "@/components/ForYouOnboarding";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import {
  getForYouInterests,
  hasCompletedForYouOnboarding,
  tagsForInterests,
  type InterestId,
  INTEREST_OPTIONS,
} from "@/lib/forYouInterests";
import CategoryIcon from "@/components/CategoryIcon";

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
  verificationLevel?: "blue" | "gold" | "black";
  bio?: string;
  avatarUrl?: string;
};

const SAMPLE_PROVIDERS: Provider[] = [
  { id: "1", name: "James Otieno", avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg", skill: "Plumbing", area: "Westlands", km: 1.2, rate: 1500, rating: 4.9, reviews: 87, icon: "🔧", available: "Available today", tags: ["M-Pesa"], latitude: -1.2676, longitude: 36.8108 },
  { id: "2", name: "Peter Kamau", avatarUrl: "https://randomuser.me/api/portraits/men/41.jpg", skill: "Masonry", area: "Kilimani", km: 2.4, rate: 2000, rating: 4.7, reviews: 42, icon: "🧱", available: "This week", tags: ["Cash", "M-Pesa"], latitude: -1.2921, longitude: 36.7876 },
  { id: "3", name: "Grace Wanjiku", avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg", skill: "Tailoring", area: "Parklands", km: 0.8, rate: 800, rating: 5.0, reviews: 63, icon: "✂️", available: "Available now", tags: ["M-Pesa"], latitude: -1.2580, longitude: 36.8170 },
  { id: "4", name: "Brian Mutua", avatarUrl: "https://randomuser.me/api/portraits/men/52.jpg", skill: "Electrical", area: "Ruaka", km: 3.1, rate: 1800, rating: 4.8, reviews: 54, icon: "⚡", available: "Available today", tags: ["M-Pesa"], latitude: -1.2046, longitude: 36.7760 },
  { id: "5", name: "Amina Hassan", avatarUrl: "https://randomuser.me/api/portraits/women/32.jpg", skill: "Cleaning", area: "Eastleigh", km: 1.9, rate: 1200, rating: 4.6, reviews: 31, icon: "🧹", available: "Available now", tags: ["M-Pesa"], latitude: -1.2760, longitude: 36.8500 },
  { id: "6", name: "Samuel Kiptoo", avatarUrl: "https://randomuser.me/api/portraits/men/75.jpg", skill: "Carpentry", area: "Kasarani", km: 4.2, rate: 2500, rating: 4.5, reviews: 28, icon: "🪚", available: "This week", tags: ["Cash", "M-Pesa"], latitude: -1.2218, longitude: 36.8970 },
  { id: "7", name: "Lucy Njeri", avatarUrl: "https://randomuser.me/api/portraits/women/65.jpg", skill: "Painting", area: "Westlands", km: 1.5, rate: 1600, rating: 4.9, reviews: 39, icon: "🎨", available: "Available today", tags: ["M-Pesa"], latitude: -1.2676, longitude: 36.8108 },
  { id: "8", name: "David Ochieng", avatarUrl: "https://randomuser.me/api/portraits/men/68.jpg", skill: "Photography", area: "Kilimani", km: 2.0, rate: 3000, rating: 4.8, reviews: 71, icon: "📷", available: "This week", tags: ["M-Pesa"], latitude: -1.2921, longitude: 36.7876 },
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
    verificationLevel: String(row.role || "").toLowerCase() === "professional" || String(row.service_category || "").toLowerCase() === "legal" || String(row.service_category || "").toLowerCase() === "architecture" || String(row.service_category || "").toLowerCase() === "engineering" ? "black" : "blue",
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
  const [forYouInterests, setForYouInterestsState] = useState<InterestId[]>([]);
  const [showForYouOnboard, setShowForYouOnboard] = useState(false);

  useEffect(() => {
    setLangState(getLang());
    setUserLocation(getSavedLocation());
    setForYouInterestsState(getForYouInterests());
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
    const cat = activeCategory.trim().toLowerCase();
    return providers.filter((p) => {
      const skill = (p.skill || "").toLowerCase();
      const tags = (p.tags || []).map((t) => t.toLowerCase());
      const categoryMatch =
        cat === "all" ||
        skill === cat ||
        skill.includes(cat) ||
        cat.includes(skill) ||
        tags.some((t) => t === cat || t.includes(cat) || cat.includes(t));
      const searchMatch =
        !q ||
        [p.name, p.skill, p.area, p.bio || "", ...(p.tags || [])].some((value) =>
          String(value).toLowerCase().includes(q)
        );
      return categoryMatch && searchMatch;
    }).sort((a, b) => a.km - b.km || a.name.localeCompare(b.name));
  }, [providers, search, activeCategory]);

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
    if (tab === "for-you" && !hasCompletedForYouOnboarding()) {
      setShowForYouOnboard(true);
    }
  };

  const progress = (status: string) => ({
    requested: 18, quote_pending: 30, accepted: 48, en_route: 68,
    in_progress: 84, completed: 100, declined: 0, cancelled: 0, rescheduled: 32,
  }[status] ?? 18);

  return (
    <main className="savis-app-shell min-h-screen pb-28">
      <header className="savis-app-header"><div className="savis-app-header-inner">
        <button type="button" onClick={() => setTab("profile")} className="savis-logo-button" aria-label="Open SAVIS profile"><Logo size="sm" /></button>
        <div className="savis-app-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setActiveTab("home"); setTimeout(() => document.getElementById("nearby-results")?.scrollIntoView({ behavior: "smooth" }), 50); } }} placeholder="Search services, products..." aria-label="Search services and products" /></div>
        <Link href="/consumer/payments" className="savis-wallet-icon" aria-label="Wallet and payments">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7.5h15a2.5 2.5 0 0 1 0 5H5.5A2.5 2.5 0 0 0 3 15v2.5A2.5 2.5 0 0 0 5.5 20H19a2 2 0 0 0 2-2v-5.5" />
            <path d="M3 7.5V5.5A2.5 2.5 0 0 1 5.5 3H16" />
            <circle cx="17.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </Link>
        <button type="button" className="savis-avatar-button" onClick={() => setTab("profile")} aria-label="Open profile">{profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}</button>
      </div></header>

      {activeTab === "home" && <div className="savis-app-content">
        <section className="savis-hero-card"><div className="savis-hero-copy"><span className="savis-red-pill">SAVIS</span><h1>Discover Local<br /><strong>Services & Products</strong></h1><p>Find trusted professionals, quality products and everything you need — all in one place.</p><button type="button" onClick={() => document.getElementById("nearby-results")?.scrollIntoView({ behavior: "smooth" })} className="savis-primary-button">SHOP NOW <span>→</span></button></div><div className="savis-hero-art" aria-hidden="true"><span className="savis-art-phone">▣</span><span className="savis-art-tools">🔧</span><span className="savis-art-camera">▣</span><span className="savis-art-headphones">◉</span><span className="savis-art-bricks">▦</span><span className="savis-art-ring" /></div></section>

        <CategoryStrip
          activeSubId={activeCategory !== "all" ? activeCategory.toLowerCase().replace(/\s+/g, "-") : undefined}
          onSelectSub={(sub) => {
            const primary = sub.tags[0] || sub.label;
            setActiveCategory(primary);
            setSearch("");
            setTimeout(() => document.getElementById("nearby-results")?.scrollIntoView({ behavior: "smooth" }), 80);
          }}
        />

        <section id="nearby-results" className="savis-provider-section">
          <div className="savis-section-heading">
            <div>
              <span>DISCOVER</span>
              <h2>{search || activeCategory !== "all" ? "Results (" + filtered.length + ")" : "People near you"}</h2>
              <p>{providerMessage || "Trusted local providers"}</p>
            </div>
            <Link href="/consumer/nearby" style={{ fontSize: ".75rem", fontWeight: 900, color: "#fff", textDecoration: "none" }}>View All</Link>
          </div>
          <div className="savis-provider-list">{filtered.slice(0, 12).map((p) => (
            <Link key={p.id} href={"/consumer/provider/" + p.id} className="savis-provider-row">
              <div className="savis-provider-row-avatar">
                {p.avatarUrl ? <img src={p.avatarUrl} alt="" loading="lazy" /> : <span>{p.name.charAt(0)}</span>}
                <i className={p.available?.toLowerCase().includes("now") || p.available?.toLowerCase().includes("today") ? "is-online" : ""} />
              </div>
              <div className="savis-provider-row-main">
                <div className="savis-provider-row-line1">
                  <b>{p.name}</b>
                  <span className="savis-provider-row-rating">★ {p.rating ? p.rating.toFixed(1) : "New"}{p.reviews ? ` (${p.reviews})` : ""}</span>
                </div>
                <div className="savis-provider-row-line2">{p.skill} · {p.km.toFixed(1)} km away</div>
                <div className="savis-provider-row-line3">
                  {p.verified !== false ? <em>Verified Fundi</em> : <em>SAVIS Provider</em>}
                  <span>· {p.area}</span>
                </div>
              </div>
              <span className="savis-provider-row-action">VIEW</span>
            </Link>
          ))}</div>
          {filtered.length === 0 && <div className="savis-empty-state">No providers match this search yet.</div>}
        </section>
      </div>}

      {activeTab === "for-you" && <div className="savis-app-content">
        <section className="savis-page-title">
          <span>DISCOVERY</span>
          <h1>For You</h1>
          <p>Providers and services matched to your interests.</p>
        </section>

        <section className="savis-fy-section">
          <h2>Matched for you</h2>
          <div className="savis-provider-list">
            {(forYouInterests.length
              ? providers.filter((p) => {
                  const tags = tagsForInterests(forYouInterests);
                  const skill = (p.skill || "").toLowerCase();
                  return tags.some((t) => skill.includes(t) || t.includes(skill));
                })
              : providers
            ).slice(0, 10).map((p) => (
              <Link key={p.id} href={"/consumer/provider/" + p.id} className="savis-provider-row">
                <div className="savis-provider-row-avatar">
                  {p.avatarUrl ? <img src={p.avatarUrl} alt="" loading="lazy" /> : <span>{p.name.charAt(0)}</span>}
                  <i className={p.available?.toLowerCase().includes("now") || p.available?.toLowerCase().includes("today") ? "is-online" : ""} />
                </div>
                <div className="savis-provider-row-main">
                  <div className="savis-provider-row-line1">
                    <b>{p.name}</b>
                    <span className="savis-provider-row-rating">★ {p.rating ? p.rating.toFixed(1) : "New"}</span>
                  </div>
                  <div className="savis-provider-row-line2">{p.skill} · {p.km.toFixed(1)} km</div>
                  <div className="savis-provider-row-line3">
                    {p.verified !== false ? <em>Verified Fundi</em> : <em>SAVIS Provider</em>}
                    <span>· {p.area}</span>
                  </div>
                </div>
                <span className="savis-provider-row-action">VIEW</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="savis-fy-section">
          <h2>Browse by category</h2>
          <div className="savis-fy-cat-grid">
            {INTEREST_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="savis-fy-cat-card"
                onClick={() => {
                  const primary = opt.tags[0] || opt.label;
                  setActiveCategory(primary);
                  setSearch("");
                  setTab("home");
                }}
              >
                <span className="savis-fy-cat-visual" aria-hidden="true">
                  <CategoryIcon id={opt.icon} />
                </span>
                <span className="savis-fy-cat-body">
                  <b>{opt.label}</b>
                  <small>View listings →</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        {FEATURE_FLAGS.shortVideosBanner && (
          <section className="savis-red-panel">
            <b>COMING SOON</b>
            <h2>Short videos from local businesses</h2>
            <p>See work in progress, product demos and finished projects, then save or hire directly.</p>
          </section>
        )}

        <ForYouOnboarding
          open={showForYouOnboard}
          onDone={(ids) => {
            setForYouInterestsState(ids);
            setShowForYouOnboard(false);
          }}
        />
      </div>}

      {activeTab === "jobs" && <div className="savis-app-content"><section className="savis-page-title"><span>TRACKING</span><h1>Jobs</h1><p>Follow your active work, quotes and service history.</p></section><Link href="/bookings" className="savis-wide-action">OPEN FULL BOOKINGS <span>→</span></Link>{bookings.slice(0,4).map((booking) => <Link key={booking.id} href="/bookings" className="savis-job-modern"><div><b>{booking.providerName}</b><p>{booking.skill} · #SV-{booking.id.slice(-4)}</p></div><span>{booking.status.replace("_"," ")}</span><div className="savis-job-progress"><i style={{width: (progress(booking.status) + "%")}} /></div></Link>)}{bookings.length === 0 && <div className="savis-empty-state"><b>No active jobs yet</b><p>When you request a provider, live progress will appear here.</p></div>}</div>}

      {activeTab === "messages" && <div className="savis-app-content"><section className="savis-page-title"><span>INBOX & PAYMENTS</span><h1>Messages</h1><p>Service enquiries, quote alerts and payment updates stay together.</p></section>
        <div className="savis-message-cards">
          <Link href="/messages" className="savis-message-card"><span>💬</span><b>Enquiries</b><small>Provider chats</small></Link>
          <Link href="/consumer/payments" className="savis-message-card"><span>💳</span><b>Payments</b><small>M-Pesa / wallet</small></Link>
          <Link href="/bookings" className="savis-message-card"><span>🔔</span><b>Alerts</b><small>Quotes & milestones</small></Link>
        </div>
        <section className="savis-modern-panel"><div className="savis-panel-heading"><b>Recent activity</b><span>SECURE</span></div>{bookings.slice(0,4).map((b) => <Link key={b.id} href="/bookings" className="savis-message-row"><div><b>{b.providerName}</b><p>{b.skill} · {b.description.slice(0,50)}</p></div><span>{b.status.replace("_"," ")}</span></Link>)}{bookings.length === 0 && conversations.length === 0 && <div className="savis-empty-state">Your provider conversations and payment alerts will appear here.</div>}</section></div>}

      {activeTab === "profile" && <div className="savis-app-content"><section className="savis-profile-modern"><div className="savis-profile-avatar-large">{profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}</div><div><span>ACCOUNT</span><h1>{profile?.full_name || "Your SAVIS profile"}</h1><p>{profile?.email || "Consumer"} · SAVIS member</p></div><Link href="/profile/edit" className="savis-outline-button">EDIT</Link></section><div className="savis-profile-grid">{[["⚙️","Settings","Appearance, language, notifications and location","/settings"],["🔐","Security","Password, 2FA and device management","/settings"],["❤️","Saved providers","Favorites and trusted providers","/profile"],["📋","Bookings & receipts","History, reviews and receipts","/bookings"]].map(([icon,title,desc,href]) => <Link key={title} href={href} className="savis-profile-action"><span>{icon}</span><div><b>{title}</b><small>{desc}</small></div><strong>→</strong></Link>)}</div><section className="savis-wallet-modern"><span>SAVIS WALLET</span><strong>Ready for M-Pesa & escrow</strong><p>Payment protection, holds and refunds will appear here as the production wallet goes live.</p></section></div>}

      <SavisOnboarding open={showTutorial} onClose={() => setShowTutorial(false)} />
      {mapMode && <div className="fixed inset-0 z-[70] bg-[#11171c]"><SavisMap center={mapCenter} providers={filtered} fullScreen radiusKm={radius} selectedProviderId={selectedMapProvider?.id || null} onSelect={setSelectedMapProvider} /><div className="savis-map-overlay-head"><Logo size="sm" /><button type="button" onClick={() => setMapMode(false)}>Close ✕</button></div><div className="savis-map-overlay-foot"><b>{filtered.length} providers in view</b><button type="button" onClick={enableLocation}>Recenter</button></div></div>}

      <nav className="savis-bottom-nav"><div>{tabItems.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={activeTab===item.id ? "is-active" : ""}><span>{item.icon}</span><b>{item.label}</b>{item.id==="messages" && bookings.length > 0 ? <i /> : null}</button>)}</div></nav>
    </main>
  );
}
