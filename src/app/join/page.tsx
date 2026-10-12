"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

type Mode = "provider" | "consumer";

const PROVIDER_CATEGORIES = [
  "Plumber",
  "Electrician",
  "Cleaner",
  "Carpenter",
  "Mason",
  "Painter",
  "Tailor",
  "Mechanic",
  "Photographer",
  "Other",
];

const PROVIDER_PERKS = [
  { title: "Verified badge", sub: "Build trust. Get more jobs." },
  { title: "Low commission", sub: "Keep more of what you earn." },
  { title: "Exclusive requests", sub: "Jobs matched to your skill." },
  { title: "Protected payouts", sub: "Money released when work is done." },
];

const CONSUMER_PERKS = [
  { title: "Trusted locals", sub: "Verified pros near you." },
  { title: "Safe payments", sub: "Escrow until the job is complete." },
  { title: "Quotes & chat", sub: "Compare offers before you book." },
  { title: "Track every job", sub: "Status updates in one place." },
];

export default function JoinPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("consumer");
  const [category, setCategory] = useState("Plumber");
  const [catOpen, setCatOpen] = useState(false);

  const isProvider = mode === "provider";

  const signupHref = useMemo(() => {
    if (isProvider) {
      return `/signup?role=provider&category=${encodeURIComponent(category)}`;
    }
    return "/signup?role=consumer";
  }, [isProvider, category]);

  return (
    <main className="savis-app-shell min-h-screen">
      <header className="savis-app-header">
        <div
          className="savis-app-header-inner"
          style={{ gridTemplateColumns: "auto 1fr auto" }}
        >
          <Link href="/" className="savis-logo-button" aria-label="SAVIS home">
            <Logo size="sm" />
          </Link>
          <div />
          <Link
            href="/login"
            className="text-xs font-bold text-white/70 px-3 py-2 whitespace-nowrap hover:text-white"
          >
            Log in
          </Link>
        </div>
      </header>

      <div className="savis-app-content max-w-lg mx-auto pb-16">
        <div className="text-center mb-6 pt-2">
          <span className="savis-red-pill">JOIN SAVIS</span>
          <h1 className="mt-4 text-[1.75rem] sm:text-[2rem] font-black tracking-tight leading-tight">
            How do you want to
            <br />
            <strong className="text-[#ff2a32]">use SAVIS?</strong>
          </h1>
          <p className="mt-2 text-sm text-white/55 max-w-sm mx-auto">
            Pick a path. You can always switch later from settings.
          </p>
        </div>

        {/* Segmented control — red active */}
        <div
          className="flex rounded-2xl border border-white/12 p-1 mb-5"
          style={{ background: "rgba(255,255,255,0.04)" }}
          role="tablist"
          aria-label="Join as"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isProvider}
            onClick={() => setMode("consumer")}
            className={`flex-1 rounded-xl py-3 text-[0.72rem] font-black tracking-wide transition ${
              !isProvider
                ? "bg-gradient-to-r from-[#E22227] to-[#C7080C] text-white shadow-lg shadow-red-900/40"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            JOIN AS CONSUMER
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isProvider}
            onClick={() => setMode("provider")}
            className={`flex-1 rounded-xl py-3 text-[0.72rem] font-black tracking-wide transition ${
              isProvider
                ? "bg-gradient-to-r from-[#E22227] to-[#C7080C] text-white shadow-lg shadow-red-900/40"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            BECOME A PROVIDER
          </button>
        </div>

        {/* Dynamic preview card */}
        <section
          className="relative overflow-hidden rounded-[24px] border border-white/12 mb-4"
          style={{
            background:
              "linear-gradient(145deg, rgba(22,26,30,0.95), rgba(12,14,16,0.98))",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
            style={{
              background: isProvider
                ? "rgba(226,34,39,0.35)"
                : "rgba(245,196,81,0.18)",
            }}
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-black tracking-[0.16em] text-[#F5C451]">
                  {isProvider ? "EARN ON SAVIS" : "BOOK WITH CONFIDENCE"}
                </p>
                <h2 className="mt-1.5 text-xl font-black leading-snug">
                  {isProvider
                    ? "Get real jobs.\nGet paid safely."
                    : "Find pros near you.\nPay only when done."}
                </h2>
              </div>
              <div
                className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border border-white/10"
                style={{
                  background: isProvider
                    ? "linear-gradient(135deg,#E22227,#6c0102)"
                    : "linear-gradient(135deg,#2a3238,#111417)",
                }}
                aria-hidden
              >
                {isProvider ? "🔧" : "📍"}
              </div>
            </div>

            {/* Compact trust chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {(isProvider
                ? ["Verified", "Low fees", "Weekly payouts"]
                : ["Escrow", "Nearby", "Chat"]
              ).map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[0.68rem] font-bold text-white/80"
                >
                  <i className="w-1.5 h-1.5 rounded-full bg-[#E22227]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Category — provider only */}
        {isProvider && (
          <div className="relative mb-4">
            <button
              type="button"
              onClick={() => setCatOpen((v) => !v)}
              className="w-full flex items-center justify-between rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-left hover:border-white/20 transition"
            >
              <span className="text-[0.7rem] font-bold text-white/45 tracking-wide">
                YOUR CATEGORY{" "}
                <span className="text-white font-black ml-1">
                  {category.toUpperCase()}
                </span>
              </span>
              <span className="text-white/40 text-xs">{catOpen ? "▴" : "▾"}</span>
            </button>
            {catOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1.5 rounded-2xl border border-white/12 bg-[#12161a] shadow-2xl max-h-52 overflow-auto">
                {PROVIDER_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCategory(c);
                      setCatOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition ${
                      c === category
                        ? "bg-[#E22227]/15 text-[#ff6b6f]"
                        : "text-white/75 hover:bg-white/[0.05]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Perks */}
        <ul className="space-y-2.5 mb-6">
          {(isProvider ? PROVIDER_PERKS : CONSUMER_PERKS).map((perk) => (
            <li
              key={perk.title}
              className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3"
            >
              <span className="mt-0.5 w-5 h-5 rounded-full bg-[#E22227]/15 text-[#ff4d52] flex items-center justify-center text-[0.65rem] font-black shrink-0">
                ✓
              </span>
              <div>
                <p className="text-sm font-bold text-white">{perk.title}</p>
                <p className="text-[0.72rem] text-white/45 mt-0.5">{perk.sub}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => router.push(signupHref)}
          className="savis-primary-button w-full justify-center text-sm py-3.5"
        >
          {isProvider ? "Continue as Provider" : "Continue as Consumer"}
          <span>→</span>
        </button>

        <p className="text-center text-[0.75rem] text-white/40 mt-4">
          {isProvider ? (
            <>
              Representing a firm or company?{" "}
              <Link
                href="/signup?role=provider&type=business"
                className="font-bold text-[#F5C451] hover:underline"
              >
                Work with SAVIS
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-[#F5C451] hover:underline">
                Log in
              </Link>
            </>
          )}
        </p>

        <p className="text-center mt-6">
          <Link
            href="/"
            className="text-sm font-semibold text-white/40 hover:text-white/70"
          >
            ← Back to browse
          </Link>
        </p>
      </div>
    </main>
  );
}
