"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import SavisBottomNav from "@/components/SavisBottomNav";

export default function EditProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
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
        .select("full_name,email,avatar_url,bio,location_name")
        .eq("id", user.id)
        .maybeSingle();
      setName(data?.full_name || user.user_metadata?.full_name || "");
      setAvatar(data?.avatar_url || user.user_metadata?.avatar_url || "");
      setBio(data?.bio || "");
      setLocation(data?.location_name || "");
    })();
  }, [router]);

  function onPickFile(f: File | null) {
    setFile(f);
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const s = createClient();
      let avatarUrl = avatar;

      if (file) {
        const compressed = await compressImage(file);
        const path = `${userId}/avatar-${Date.now()}.jpg`;
        const up = await s.storage.from("profile-media").upload(path, compressed, {
          contentType: "image/jpeg",
          upsert: true,
        });
        if (up.error) {
          // Fallback: try public bucket name variants / show real error
          throw new Error(
            up.error.message +
              " — Create a public Storage bucket named \"profile-media\" in Supabase if it is missing."
          );
        }
        avatarUrl = s.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
      }

      const p = await s
        .from("profiles")
        .update({
          full_name: name.trim() || "SAVIS User",
          email: email.trim(),
          avatar_url: avatarUrl || null,
          bio: bio.trim() || null,
          location_name: location.trim() || null,
        })
        .eq("id", userId);
      if (p.error) throw p.error;

      const { error: authError } = await s.auth.updateUser({
        email: email.trim(),
        data: { full_name: name.trim(), avatar_url: avatarUrl || null },
      });
      if (authError) {
        // Profile row may still have saved; surface auth note without blocking
        console.warn(authError.message);
      }

      setAvatar(avatarUrl);
      setFile(null);
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
      setMessage("Profile saved.");
      setTimeout(() => router.push("/profile"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  const shown = preview || avatar;

  return (
    <main className="savis-app-shell min-h-screen pb-28">
      <div className="savis-app-content max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black">Edit profile</h1>
          <Link href="/profile" className="text-sm font-bold text-white/70">
            ← Back
          </Link>
        </div>

        <div className="mb-5 flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-[#6C0102] to-[#C7080C] flex items-center justify-center text-2xl font-black">
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
          <p className="text-xs text-white/50 mb-3">New photo selected — tap Save to upload.</p>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">FULL NAME</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/15 text-white outline-none"
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
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">BIO</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/15 text-white outline-none"
            />
          </div>

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
      <SavisBottomNav active="profile" />
    </main>
  );
}
