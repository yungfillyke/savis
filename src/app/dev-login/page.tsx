"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function DeveloperLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/developer/id-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: id.trim(), password }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.session?.access_token || !result.session?.refresh_token) {
        setError(result.error || "Developer sign-in failed.");
        setBusy(false);
        return;
      }
      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
      if (sessionError) {
        setError("Sign-in succeeded, but the secure session could not be saved. Please try again.");
        setBusy(false);
        return;
      }
      const requested = params.get("next") || "/dev-console-9f3k";
      const destination = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dev-console-9f3k";
      router.replace(destination);
      router.refresh();
    } catch {
      setError("Unable to reach SAVIS. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-[#07050d] px-4 text-white">
      <section className="w-full max-w-md rounded-3xl border border-violet-400/20 bg-white/[.04] p-7 shadow-2xl">
        <p className="text-[11px] font-black uppercase tracking-[.25em] text-[#F5C451]">SAVIS Internal</p>
        <h1 className="mt-3 text-3xl font-black">Developer access</h1>
        <p className="mt-2 text-sm leading-6 text-white/60">Sign in with your dedicated developer ID. This is separate from customer and provider login.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-white/60">
            Developer ID
            <input autoComplete="username" required value={id} onChange={(event) => setId(event.target.value)} placeholder="123456789@ABC" className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3.5 text-base text-white outline-none focus:border-[#F5C451]" />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/60">
            Password
            <input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3.5 text-base text-white outline-none focus:border-[#F5C451]" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <button disabled={busy} className="w-full rounded-2xl bg-[#F5C451] px-4 py-3.5 font-black text-black disabled:opacity-60">{busy ? "Verifying access…" : "Enter developer console"}</button>
        </form>
        <a href="/" className="mt-5 block text-center text-xs text-white/40 hover:text-white/70">Return to SAVIS</a>
      </section>
    </main>
  );
}

export default function DeveloperLoginPage() {
  return <Suspense fallback={<main className="min-h-screen grid place-items-center bg-[#07050d] text-white">Loading secure sign-in…</main>}><DeveloperLoginForm /></Suspense>;
}
