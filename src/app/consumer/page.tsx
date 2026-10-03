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

const CATEGORIES = [
  ["all", "All", "✨"], ["Plumbing", "Plumbing", "🔧"], ["Masonry", "Mason", "🧱"],
  ["Electrical", "Electrical", "⚡"], ["Tailoring", "Tailor", "🧵"], ["Cleaning", "Cleaning", "🧹"],
  ["Carpentry", "Carpentry", "🪚"], ["Painting", "Painting", "🎨"], ["Photography", "Photo", "📷"],
];

const PROVIDERS = [
  { id: 1, name: "James Otieno", skill: "Plumbing", area: "Westlands", km: 1.2, rate: 1500, rating: 4.9, reviews: 87, icon: "🔧", available: "Available today", tags: ["M-Pesa"], latitude: -1.2676, longitude: 36.8108 },
  { id: 2, name: "Peter Kamau", skill: "Masonry", area: "Kilimani", km: 2.4, rate: 2000, rating: 4.7, reviews: 42, icon: "🧱", available: "This week", tags: ["Cash", "M-Pesa"], latitude: -1.2921, longitude: 36.7876 },
  { id: 3, name: "Grace Wanjiku", skill: "Tailoring", area: "Parklands", km: 0.8, rate: 800, rating: 5.0, reviews: 63, icon: "✂️", available: "Available now", tags: ["M-Pesa"], latitude: -1.2580, longitude: 36.8170 },
  { id: 4, name: "Brian Mutua", skill: "Electrical", area: "Ruaka", km: 3.1, rate: 1800, rating: 4.8, reviews: 54, icon: "⚡", available: "Available today", tags: ["M-Pesa"], latitude: -1.2046, longitude: 36.7760 },
  { id: 5, name: "Amina Hassan", skill: "Cleaning", area: "Eastleigh", km: 1.9, rate: 1200, rating: 4.6, reviews: 31, icon: "🧹", available: "Available now", tags: ["M-Pesa"], latitude: -1.2760, longitude: 36.8500 },
  { id: 6, name: "Samuel Kiptoo", skill: "Carpentry", area: "Kasarani", km: 4.2, rate: 2500, rating: 4.5, reviews: 28, icon: "🪚", available: "This week", tags: ["Cash", "M-Pesa"], latitude: -1.2218, longitude: 36.8970 },
  { id: 7, name: "Lucy Njeri", skill: "Painting", area: "Westlands", km: 1.5, rate: 1600, rating: 4.9, reviews: 39, icon: "🎨", available: "Available today", tags: ["M-Pesa"], latitude: -1.2676, longitude: 36.8108 },
  { id: 8, name: "David Ochieng", skill: "Photography", area: "Kilimani", km: 2.0, rate: 3000, rating: 4.8, reviews: 71, icon: "📷", available: "This week", tags: ["M-Pesa"], latitude: -1.2921, longitude: 36.7876 },
];

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

  useEffect(() => { setLangState(getLang()); setUserLocation(getSavedLocation()); }, []);

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
    return PROVIDERS.map((p) => ({
      ...p,
      distanceKm: userLocation ? distanceKm(userLocation, { latitude: p.latitude, longitude: p.longitude }) : p.km,
    })).filter((p) => {
      const categoryMatch = activeCategory === "all" || p.skill === activeCategory;
      const searchMatch = !q || [p.name, p.skill, p.area].some((value) => value.toLowerCase().includes(q));
      return categoryMatch && searchMatch;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [search, activeCategory, userLocation]);        <section className="mb-6 overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <div>
              <h2 className="font-extrabold text-lg">Nearby map</h2>
              <p className="mt-0.5 text-xs text-[#B9C3C9]">{userLocation ? "Centered on your current location" : "Showing Nairobi until you enable location"}</p>
            </div>
            <a href={"https://www.openstreetmap.org/?mlat=" + mapCenter.latitude + "&mlon=" + mapCenter.longitude + "#map=13/" + mapCenter.latitude + "/" + mapCenter.longitude} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#F5C451]">Open map ↗</a>
          </div>
          <div className="mt-4 overflow-hidden border-y border-white/10">
            <iframe title="SAVIS nearby map" src={mapUrl} className="h-64 w-full border-0" loading="lazy" />
          </div>
          <p className="px-4 py-3 text-[0.65rem] text-[#55666E]">Map data © OpenStreetMap contributors.</p>
        </section>

