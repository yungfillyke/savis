"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import Button from "@/components/Button";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") || "consumer";

  const initialRole =
    ["provider", "professional", "seller", "agent"].includes(roleParam || "")
      ? roleParam!
      : "consumer";
  const [role, setRole] = useState(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [social, setSocial] = useState(false);

  async function signInWithGoogle() {
    setSocial(true);
    setError("");
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/consumer")}`,
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

    if (password.length < 8 || !/\d/.test(password)) {
      setError("Password needs at least 8 characters and one number.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (!acceptedTerms) {
      setError("Please agree to the Terms and Privacy Policy.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error: signError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          role,
        },
      },
    });

    if (signError) {
      setError(signError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
      });
    }

    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <Logo size="sm" />
          <h1 className="text-2xl font-extrabold mt-6 mb-2">Check your email</h1>
          <p className="text-[#B9C3C9] text-sm mb-6">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
            Click it, then log in.
          </p>
          <Link href="/login">
            <Button full>Go to Log in</Button>
          </Link>
        </div>
      </main>
    );
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

        <h1 className="text-2xl font-extrabold mb-1">Create your account</h1>
        <p className="text-[#B9C3C9] text-sm mb-6">
          Join as a{" "}
          {
            (
              {
                consumer: "Consumer",
                provider: "Provider",
                professional: "Professional",
                seller: "Seller",
                agent: "Agent",
              } as Record<string, string>
            )[role]
          }
          .
        </p>

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={social || loading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white px-4 py-3.5 font-bold text-[#1a1a1a] hover:bg-white/90 disabled:opacity-50 mb-5"
        >
          <span style={{ fontWeight: 900 }}>G</span>
          {social ? "Connecting to Google…" : "Continue with Google"}
        </button>
        <div className="mb-5 flex items-center gap-3 text-xs text-[#B9C3C9]">
          <span className="h-px flex-1 bg-white/10" />
          <span>OR EMAIL</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">FULL NAME</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227]"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">EMAIL</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227]"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">PHONE (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227]"
              placeholder="07…"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">PASSWORD</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227]"
              placeholder="At least 8 characters + a number"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1.5">CONFIRM PASSWORD</label>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227]"
              placeholder="Repeat password"
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-[#B9C3C9]">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1"
            />
            <span>
              I agree to the <Link href="/terms" className="text-[#F5C451]">Terms</Link> and{" "}
              <Link href="/privacy" className="text-[#F5C451]">Privacy Policy</Link>.
            </span>
          </label>
          {error && <p className="text-[#ff8a8d] text-sm font-semibold">{error}</p>}
          <Button type="submit" full disabled={loading || social}>
            {loading ? "Creating account…" : "Sign up"}
          </Button>
        </form>

        <p className="text-center text-sm text-[#B9C3C9] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#F5C451] font-bold">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-[#B9C3C9]">Loading…</p>
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
