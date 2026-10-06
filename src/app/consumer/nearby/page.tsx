"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import SavisMap, { type SavisMapProvider } from "@/components/SavisMap";
import { distanceKm, getSavedLocation, type UserLocation } from "@/lib/location";
import { publicMapPosition } from "@/lib/locationPrivacy";

type Provider = {
  id: string;
  name: string;
  skill: string;
  area: string;
  km: number;
  rate: number;
  rating: number;
  reviews: number;
  available: string;
  verified?: boolean;
  avatarUrl?: string;
  latitude?: number;
  longitude?: number;
};

const SAMPLE: Provider[] = [
  { id: "1", name: "James Otieno", skill: "Plumbing", area: "Westlands", km: 1.2, rate: 1500, rating: 4.9, reviews: 87, available: "Available today", avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg", latitude: -1.2676, longitude: 36.8108, verified: true },
  { id: "2", name: "Peter Kamau", skill: "Masonry", area: "Kilimani", km: 2.4, rate: 2000, rating: 4.7, reviews: 42, available: "This week", avatarUrl: "https://randomuser.me/api/portraits/men/41.jpg", latitude: -1.2921, longitude: 36.7876, verified: true },
  { id: "3", name: "Grace Wanjiku", skill: "Tailoring", area: "Parklands", km: 0.8, rate: 800, rating: 5.0, reviews: 63, available: "Available now", avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg", latitude: -1.258, longitude: 36.817, verified: true },
  { id: "4", name: "Brian Mutua", skill: "Electrical", area: "Ruaka", km: 3.1, rate: 1800, rating: 4.8, reviews: 54, available: "Available today", avatarUrl: "https://randomuser.me/api/portraits/men/52.jpg", latitude: -1.2046, longitude: 36.776, verified: true },
  { id: "5", name: "Amina Hassan", skill: "Cleaning", area: "Eastleigh", km: 1.9, rate: 1200, rating: 4.6, reviews: 31, available: "Available now", avatarUrl: "https://randomuser.me/api/portraits/women/32.jpg", latitude: -1.276, longitude: 36.85, verified: true },
  { id: "6", name: "Samuel Kiptoo", skill: "Carpentry", area: "Kasarani", km: 4.2, rate: 2500, rating: 4.5, reviews: 28, available: "This week", avatarUrl: "https://randomuser.me/api/portraits/men/75.jpg", latitude: -1.2218, longitude: 36.897, verified: true },
];

export default function NearbyPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>(SAMPLE);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [selected, setSelected] = useState<SavisMapProvider | null>(null);

  useEffect(() => {
    setUserLocation(getSavedLocation());
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const loc = getSavedLocation();
      const result = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, latitude, longitude, location_name, service_category, hourly_rate, rating, review_count, availability, verified")
        .in("role", ["provider", "professional"])
        .not("latitude", "is", null)
        .limit(60);
      if (!result.error && result.data?.length) {
        const rows: Provider[] = result.data.map((row) => {
          const lat = row.latitude != null ? Number(row.latitude) : undefined;
          const lng = row.longitude != null ? Number(row.longitude) : undefined;
          const km =
            loc && lat != null && lng != null
              ? distanceKm(loc, { latitude: lat, longitude: lng })
              : 0;
          return {
            id: String(row.id),
            name: String(row.full_name || "SAVIS provider"),
            skill: String(row.service_category || "General"),
            area: String(row.location_name || "Nearby"),
            km,
            rate: Number(row.hourly_rate) || 0,
            rating: Number(row.rating) || 0,
            reviews: Number(row.review_count) || 0,
            available: String(row.availability || "Available"),
            verified: Boolean(row.verified),
            avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
            latitude: lat,
            longitude: lng,
          };
        });
        rows.sort((a, b) => a.km - b.km);
        setProviders(rows);
      }
    }
    void load();
  }, [router]);

  const sorted = useMemo(
    () => [...providers].sort((a, b) => a.km - b.km),
    [providers]
  );

  const mapCenter = userLocation || { latitude: -1.2864, longitude: 36.8172 };

  const mapProviders: SavisMapProvider[] = sorted
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => {
      const pos = publicMapPosition(p.latitude!, p.longitude!, p.id, "approximate");
      return {
        id: p.id,
        name: p.name,
        skill: p.skill,
        area: p.area,
        latitude: pos.latitude,
        longitude: pos.longitude,
        rating: p.rating,
        avatarUrl: p.avatarUrl,
        verified: p.verified,
      } as SavisMapProvider;
    });

  return (
    <main className="savis-app-shell min-h-screen pb-28">
      <header className="savis-app-header">
        <div className="savis-app-header-inner" style={{ gridTemplateColumns: "auto 1fr auto" }}>
          <button type="button" className="savis-logo-button" onClick={() => router.back()} aria-label="Back">
            ←
          </button>
          <div>
            <div className="text-[0.65rem] font-black tracking-widest text-[#f5c451]">DISCOVER</div>
            <h1 className="text-lg font-black leading-tight">People near you</h1>
          </div>
          <Logo size="sm" showTagline={false} />
        </div>
      </header>

      <div className="savis-app-content">
        <p className="text-sm text-white/60 mb-3">
          Sorted by distance{userLocation ? " from your location" : ""}. Locations shown approximately for privacy.
        </p>
        <div className="savis-provider-list">
          {sorted.map((p) => (
            <Link key={p.id} href={`/consumer/provider/${p.id}`} className="savis-provider-row">
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
          ))}
        </div>
        {sorted.length === 0 && (
          <div className="savis-empty-state">No nearby providers yet.</div>
        )}
      </div>

      <div className="savis-nearby-map-cta">
        <button type="button" onClick={() => setMapOpen(true)}>
          View on Map
        </button>
      </div>

      {mapOpen && (
        <div className="fixed inset-0 z-[70] bg-[#11171c]">
          <SavisMap
            center={mapCenter}
            providers={mapProviders}
            fullScreen
            radiusKm={15}
            selectedProviderId={selected?.id || null}
            onSelect={setSelected}
          />
          <div className="savis-map-overlay-head">
            <Logo size="sm" />
            <button type="button" onClick={() => setMapOpen(false)}>Close ✕</button>
          </div>
          <div className="savis-map-overlay-foot">
            <b>{mapProviders.length} providers (approximate pins)</b>
          </div>
        </div>
      )}
    </main>
  );
}
