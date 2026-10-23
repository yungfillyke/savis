"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { requestCurrentLocation } from "@/lib/location";
import SavisBottomNav from "@/components/SavisBottomNav";

export default function EditProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("consumer");
  const [roleReady, setRoleReady] = useState(false);
  const [serviceCategory, setServiceCategory] = useState("");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const s = createClient();
      const {
        data: { user },
      } = await s.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      setEmail(user.email || "");
      const { data } = await s
        .from("profiles")
        .select("full_name,email,avatar_url,bio,location_name,role,service_category,hourly_rate,latitude,longitude")
        .eq("id", user.id)
        .maybeSingle();
      setName(data?.full_name || user.user_metadata?.full_name || "");
      setAvatar(data?.avatar_url || user.user_metadata?.avatar_url || "");
      setBio(data?.bio || "");
      setLocation(data?.location_name || "");
      setRole(data?.role || user.user_metadata?.role || "consumer");
      setRoleReady(true);
      setServiceCategory(data?.service_category || "");
      setHourlyRate(String(data?.hourly_rate ?? 0));
      if (data?.latitude != null && data?.longitude != null) setCoordinates({ latitude: Number(data.latitude), longitude: Number(data.longitude) });
    })();
  }, [router]);

  function onPickFile(f: File | null) {
    setFile(f);
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function useCurrentLocation() {
    setLocationBusy(true);
    setError("");
    try {
      const current = await requestCurrentLocation();
      setCoordinates({ latitude: current.latitude, longitude: current.longitude });
      setMessage("Coordinates captured. Your service-area label has been kept unchanged. Save your profile to keep the coordinates.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get your location. You can enter your service area manually.");
    } finally {
      setLocationBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const s = createClient();
      let avatarUrl = avatar;
      let photoNote = "";

      if (file) {
        try {
          const compressed = await compressImage(file);
          const path = `${userId}/avatar-${Date.now()}.jpg`;
          const up = await s.storage.from("profile-media").upload(path, compressed, {
            contentType: "image/jpeg",
            upsert: true,
          });
          if (up.error) throw up.error;
          avatarUrl = s.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
        } catch (photoErr) {
          photoNote =
            photoErr instanceof Error
              ? photoErr.message
              : "Photo upload failed";
          // Continue — still save name/location
        }
      }

      const p = await s
        .from("profiles")
        .update({
          full_name: name.trim() || "SAVIS User",
          email: email.trim(),
          avatar_url: avatarUrl || null,
          bio: bio.trim() || null,
          location_name: location.trim() || null,
          service_category: ["provider", "professional"].includes(role) ? (serviceCategory.trim() || null) : null,
          hourly_rate: ["provider", "professional"].includes(role) ? Math.max(0, Math.round(Number(hourlyRate) || 0)) : 0,
          // Preserve existing coordinates unless the user explicitly sets a new location.
          // A profile edit must not silently remove a provider from radius-based discovery.
          ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
        })
        .eq("id", userId);

      if (p.error) {
        throw new Error(
          p.error.message +
            " — Your profiles table may block updates. Run the SAVIS RLS SQL in Supabase."
        );
      }

      await s.auth.updateUser({
        data: { full_name: name.trim(), avatar_url: avatarUrl || null },
      });

      setAvatar(avatarUrl);
      setFile(null);
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }

      if (photoNote) {
        setError("Name/details saved, but photo failed: " + photoNote);
        setMessage("");
      } else {
        setMessage("Profile saved.");
        setTimeout(() => router.replace(["provider","professional","producer","agent","wholesale_retail"].includes(role.toLowerCase()) ? "/provider-profile" : "/profile"), 600);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  const shown = preview || avatar;

  if (!roleReady) {
    return <main className="min-h-screen flex items-center justify-center bg-[#10243a] text-white"><p className="text-sm font-semibold text-white/70">Loading your profile…</p></main>;
  }

  return (
    <main className={["provider","professional","producer","agent","wholesale_retail"].includes(role.toLowerCase()) ? "min-h-screen pb-10 bg-[#10243a] text-[#f3f6fb]" : "savis-app-shell min-h-screen pb-28"}>
      <div className={["provider","professional","producer","agent","wholesale_retail"].includes(role.toLowerCase()) ? "mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#142b43] px-4 py-6 text-white shadow-xl shadow-black/15" : "savis-app-content max-w-lg mx-auto px-4 py-6"}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black">Edit profile</h1>
          <button
            type="button"
            onClick={() => router.replace(["provider","professional","producer","agent","wholesale_retail"].includes(role.toLowerCase()) ? "/provider-profile" : "/profile")}
            className={["provider","professional","producer","agent","wholesale_retail"].includes(role.toLowerCase()) ? "text-sm font-bold text-white/75" : "text-sm font-bold text-white/70"}
          >
            ← Back
          </button>
        </div>

        <div className="mb-5 flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-sky-200/20 bg-gradient-to-br from-[#173c5c] to-[#10243a] flex items-center justify-center text-2xl font-black">
            {shown ? (
              <img src={shown} alt="" className="h-full w-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase() || "U"
            )}
          </div>
          <label className="rounded-full border border-[#F5C451]/30 bg-[#F5C451]/10 px-4 py-2 text-xs font-black text-[#F5C451] cursor-pointer">
            Change photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        {file && (
          <p className="text-xs text-white/50 mb-3">New photo selected — tap Save to upload (auto-compressed).</p>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">FULL NAME</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/15 text-white outline-none"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/15 text-white outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">LOCATION</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/15 text-white outline-none"
              placeholder="e.g. Westlands, Nairobi"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">BIO (optional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/15 text-white outline-none"
            />
          </div>

          {["provider", "professional"].includes(role.toLowerCase()) && (
            <section className="rounded-2xl border border-[#F5C451]/20 bg-white/[0.03] p-4 space-y-4">
              <div>
                <h2 className="font-black text-white">Provider discovery details</h2>
                <p className="mt-1 text-xs leading-relaxed text-white/60">
                  Add your service and location so customers can find you. You will only appear in discovery after SAVIS verifies your account.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">SERVICE CATEGORY</label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#10243a] border border-white/15 text-white outline-none"
                >
                  <option value="">Choose your service</option>
                  {["Plumbing", "Electrical", "Masonry", "Carpentry", "Cleaning", "Painting", "Mechanics", "Tailoring", "Photography", "Architecture", "Engineering", "Legal", "Other"].map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">STARTING RATE (KSH)</label>
                <input
                  type="number"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/15 text-white outline-none"
                  placeholder="e.g. 1500"
                />
                <p className="mt-1 text-xs text-white/45">Use your starting price; agree the final quote with the customer.</p>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-sm font-semibold text-white">
                  {coordinates ? "✓ Service coordinates saved" : "Service coordinates not set"}
                </p>
                {coordinates && <p className="mt-1 text-xs text-white/50">{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</p>}
                <button
                  type="button"
                  onClick={() => void useCurrentLocation()}
                  disabled={locationBusy}
                  className="mt-3 rounded-full border border-[#F5C451]/35 px-4 py-2 text-xs font-black text-[#F5C451] disabled:opacity-50"
                >
                  {locationBusy ? "Getting location…" : "Use my current location"}
                </button>
                <p className="mt-2 text-xs leading-relaxed text-white/45">Your browser will ask permission. You can also enter your service area in the Location field above.</p>
              </div>
            </section>
          )}

          {error && <p className="text-[#ff8a8d] text-sm font-semibold">{error}</p>}
          {message && <p className="text-[#34d399] text-sm font-semibold">{message}</p>}

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="w-full py-3.5 rounded-full font-black bg-gradient-to-r from-[#E22227] to-[#C7080C] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
      {!["provider","professional","producer","agent","wholesale_retail"].includes(role.toLowerCase()) && <SavisBottomNav active="profile" />}
    </main>
  );
}
