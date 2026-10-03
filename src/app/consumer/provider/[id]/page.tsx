"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import { addBooking } from "@/lib/bookings";
import { getBalance, holdForJob } from "@/lib/wallet";
import { getSavedLocation, distanceKm } from "@/lib/location";

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
  bio: string;
  latitude?: number;
  longitude?: number;
  verified?: boolean;
};

const SAMPLE: Record<string, Provider> = {
  "1": { id: "1", name: "James Otieno", skill: "Plumbing", area: "Westlands", km: 1.2, rate: 1500, rating: 4.9, reviews: 87, icon: "🔧", available: "Available today", bio: "Experienced plumber with 8 years in Nairobi. Fast response for leaks, installations and tank work.", latitude: -1.2676, longitude: 36.8108, verified: true },
  "2": { id: "2", name: "Peter Kamau", skill: "Masonry", area: "Kilimani", km: 2.4, rate: 2000, rating: 4.7, reviews: 42, icon: "🧱", available: "This week", bio: "Reliable mason for walls, floors and small builds. Clean work and honest pricing.", latitude: -1.2921, longitude: 36.7876, verified: true },
  "3": { id: "3", name: "Grace Wanjiku", skill: "Tailoring", area: "Parklands", km: 0.8, rate: 800, rating: 5, reviews: 63, icon: "✂️", available: "Available now", bio: "Custom dresses, alterations and school uniforms. Same-week turnaround for most jobs.", latitude: -1.258, longitude: 36.817, verified: true },
  "4": { id: "4", name: "Brian Mutua", skill: "Electrical", area: "Ruaka", km: 3.1, rate: 1800, rating: 4.8, reviews: 54, icon: "⚡", available: "Available today", bio: "Licensed electrician for homes and small businesses. Safe wiring and quick fault finding.", latitude: -1.2046, longitude: 36.776, verified: true },
  "5": { id: "5", name: "Amina Hassan", skill: "Cleaning", area: "Eastleigh", km: 1.9, rate: 1200, rating: 4.6, reviews: 31, icon: "🧹", available: "Available now", bio: "Deep cleaning, move-in/out and regular home cleaning. Reliable and thorough.", latitude: -1.276, longitude: 36.85, verified: true },
  "6": { id: "6", name: "Samuel Kiptoo", skill: "Carpentry", area: "Kasarani", km: 4.2, rate: 2500, rating: 4.5, reviews: 28, icon: "🪚", available: "This week", bio: "Furniture repairs, doors, shelves and custom woodwork.", latitude: -1.2218, longitude: 36.897, verified: true },
  "7": { id: "7", name: "Lucy Njeri", skill: "Painting", area: "Westlands", km: 1.5, rate: 1600, rating: 4.9, reviews: 39, icon: "🎨", available: "Available today", bio: "Interior and exterior painting. Neat finish and careful preparation.", latitude: -1.2676, longitude: 36.8108, verified: true },
  "8": { id: "8", name: "David Ochieng", skill: "Photography", area: "Kilimani", km: 2, rate: 3000, rating: 4.8, reviews: 71, icon: "📷", available: "This week", bio: "Events, portraits and product photos. Natural style and fast delivery.", latitude: -1.2921, longitude: 36.7876, verified: true },
};

const ICONS: Record<string, string> = { Plumbing: "🔧", Masonry: "🧱", Electrical: "⚡", Tailoring: "✂️", Cleaning: "🧹", Carpentry: "🪚", Painting: "🎨", Photography: "📷" };

function rowToProvider(row: Record<string, unknown>): Provider {
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
    bio: String(row.bio || "A local SAVIS provider ready to help."),
    latitude: row.latitude == null ? undefined : Number(row.latitude),
    longitude: row.longitude == null ? undefined : Number(row.longitude),
    verified: Boolean(row.verified),
  };
}

export default function ProviderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id || "");
  const [provider, setProvider] = useState<Provider | null>(SAMPLE[id] || null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState("today");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      setBalance(getBalance());

      if (!SAMPLE[id]) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, role, latitude, longitude, location_name, service_category, hourly_rate, rating, review_count, availability, verified, bio")
          .eq("id", id)
          .maybeSingle();

        if (data) {
          const current = getSavedLocation();
          const row = {
            ...data,
            distance_km: current && data.latitude != null && data.longitude != null
              ? distanceKm(current, { latitude: Number(data.latitude), longitude: Number(data.longitude) })
              : 0,
          };
          setProvider(rowToProvider(row));
        }
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!provider) return;
    if (desc.trim().length < 5) {
      setError("Please describe the job in a few words.");
      return;
    }
    if (!location.trim()) {
      setError("Please add the job location.");
      return;
    }

    const hold = holdForJob(provider.rate, "pending", `Hold for ${provider.name}`);
    if (!hold.ok) {
      setError(hold.message + " Top up from Profile (sample).");
      return;
    }

    setBalance(getBalance());
    try {
      const currentLocation = getSavedLocation();
      await addBooking({
        providerId: id,
        providerName: provider.name,
        skill: provider.skill,
        description: desc.trim(),
        location: location.trim(),
        urgency,
        rate: provider.rate,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        locationAccuracy: currentLocation?.accuracy,
      });
      setSent(true);
    } catch {
      setError("Could not send request. Please try again.");
    }
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-[#B9C3C9]">Loading…</p></main>;
  }

  if (!provider) {
    return <main className="min-h-screen flex flex-col items-center justify-center px-4"><p className="text-[#B9C3C9] mb-4">Provider not found or not yet published.</p><Link href="/consumer"><Button>Back to Home</Button></Link></main>;
  }

  if (sent) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-extrabold mb-2">Request sent</h1>
          <p className="text-[#B9C3C9] text-sm mb-6">Your request was sent to <strong className="text-white">{provider.name}</strong>. Funds are held in SAVIS Wallet escrow. (Prototype — no real M-Pesa charge.)</p>
          <Link href="/consumer"><Button full>Back to Home</Button></Link>
          <Link href="/bookings" className="block mt-3"><Button variant="outline" full>View my bookings</Button></Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[rgba(34,43,49,0.8)] backdrop-blur-md">
        <Logo size="sm" />
        <Link href="/consumer" className="text-sm text-[#B9C3C9] hover:text-white">← Back</Link>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex gap-4 items-start mb-5">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-3xl shrink-0 relative bg-gradient-to-br from-[#6C0102] to-[#C7080C]">
            {provider.icon}
            {provider.verified !== false && <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#34D399] text-[#06281c] text-[10px] font-extrabold flex items-center justify-center border-2 border-[#222B31]">✓</span>}
          </div>
          <div>
            <h1 className="text-xl font-extrabold">{provider.name}</h1>
            <p className="text-sm text-[#B9C3C9]">{provider.skill} · {provider.km.toFixed(1)} km · {provider.area}</p>
            <p className="text-sm font-bold mt-1">{provider.rating ? `★ ${provider.rating.toFixed(1)}` : "New provider"} <span className="text-[#B9C3C9] font-normal">{provider.reviews ? `(${provider.reviews} reviews)` : ""}</span></p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full text-[#F5C451] bg-[rgba(245,196,81,0.12)] border border-[rgba(245,196,81,0.35)]">{provider.rate ? `From KSh ${provider.rate.toLocaleString()}` : "Rate on request"}</span>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full text-[#B9C3C9] bg-white/5 border border-white/10">{provider.available}</span>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full text-[#B9C3C9] bg-white/5 border border-white/10">M-Pesa</span>
        </div>

        <div className="p-4 rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] mb-4">
          <h2 className="font-bold mb-2">About</h2>
          <p className="text-sm text-[#B9C3C9] leading-relaxed">{provider.bio}</p>
        </div>

        <div className="p-4 rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] mb-6">
          <h2 className="font-bold mb-2">Location</h2>
          <p className="text-sm text-[#B9C3C9]">Approximate service area: {provider.area}. SAVIS only uses precise consumer location when you explicitly enable location.</p>
        </div>

        {!showForm ? (
          <div className="space-y-3">
            <Button full onClick={() => setShowForm(true)}>Request a quote</Button>
            <Button variant="outline" full onClick={() => setShowForm(true)}>Book now</Button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <h2 className="font-extrabold text-lg">Describe your job</h2>
            <p className="text-sm text-[#B9C3C9]">Sending request to {provider.name}</p>

            <div>
              <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">What is the problem?</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227] focus:ring-2 focus:ring-[#E22227]/30 resize-none" placeholder="e.g. Kitchen sink is leaking under the pipe" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">Where is the job?</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227] focus:ring-2 focus:ring-[#E22227]/30" placeholder="e.g. Westlands, near Sarit Centre" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">How soon?</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227]">
                <option value="now">Right now</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
              </select>
            </div>

            <div className="p-3 rounded-2xl border border-[rgba(245,196,81,0.35)] bg-[rgba(245,196,81,0.1)] text-sm">
              <p className="font-bold text-[#F5C451] mb-0.5">SAVIS Wallet · M-Pesa</p>
              <p className="text-[#B9C3C9] text-xs">KSh {provider.rate.toLocaleString()} will be held in escrow until the job is done. Balance: KSh {balance.toLocaleString()}</p>
            </div>

            {error && <p className="text-[#ff8a8d] text-sm font-semibold">{error}</p>}
            <Button type="submit" full>Send request</Button>
            <button type="button" onClick={() => setShowForm(false)} className="w-full text-sm text-[#B9C3C9] py-2">Cancel</button>
          </form>
        )}
      </div>
    </main>
  );
}
