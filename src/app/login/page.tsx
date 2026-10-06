"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import Button from "@/components/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    searchParams.get("error") ? "Social login could not be completed. Please try again." : ""
  );
  const [loading, setLoading] = useState(false);
  const [social, setSocial] = useState(false);

  async function signInWithGoogle() {
    setSocial(true);
    setError("");
    const supabase = createClient();
    const next = searchParams.get("next");
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/consumer";
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setSocial(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }
    let role = data.user?.user_metadata?.role || "consumer";
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user!.id)
      .maybeSingle();
    if (profile?.role) role = profile.role;
    setLoading(false);
    const destMap: Record<string, string> = {
      provider: "/provider",
      professional: "/professional",
      seller: "/seller",
      agent: "/agent",
      consumer: "/consumer",
    };
    const next = searchParams.get("next");
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    router.push(safeNext || destMap[role] || "/consumer");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
          <Logo size="sm" />
          <Link href="/" className="text-sm text-[#B9C3C9] hover:text-white">
            ← Back
          </Link>
        </div>
        <h1 className="text-2xl font-extrabold mb-1">Log in</h1>
        <p className="text-[#B9C3C9] text-sm mb-6">Welcome back to SAVIS</p>

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={social || loading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white px-4 py-3.5 font-bold text-[#1a1a1a] hover:bg-white/90 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.2 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l.1.1 6.3 5.3C39.2 36.3 44 31 44 24c0-1.3-.1-2.7-.4-3.9z" />
          </svg>
          {social ? "Connecting to Google…" : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-[#B9C3C9]">
          <span className="h-px flex-1 bg-white/10" />
          <span>OR EMAIL</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">EMAIL</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227] focus:ring-2 focus:ring-[#E22227]/30"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">PASSWORD</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227] focus:ring-2 focus:ring-[#E22227]/30"
              placeholder="Your password"
            />
          </div>
          {error && <p className="text-[#ff8a8d] text-sm font-semibold">{error}</p>}
          <Button type="submit" full disabled={loading || social}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="text-center text-sm text-[#B9C3C9] mt-6">
          Don't have an account yet?{" "}
          <Link href="/signup" className="text-[#F5C451] font-bold">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-[#B9C3C9]">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
