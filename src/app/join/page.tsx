"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

type Mode = "consumer" | "provider";

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

const CONSUMER_PERKS = [
  { title: "Trusted locals", sub: "Verified pros near you" },
  { title: "Safe payments", sub: "Held until the job is done" },
  { title: "Quotes & chat", sub: "Compare before you book" },
  { title: "Track every job", sub: "Status in one place" },
];

const PROVIDER_PERKS = [
  { title: "Verified badge", sub: "Win trust, win more work" },
  { title: "Low commission", sub: "Keep more of what you earn" },
  { title: "Matched jobs", sub: "Requests for your skill" },
  { title: "Protected payouts", sub: "Released when work is complete" },
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
            className="text-xs font-bold text-white/70 px-3 py-2 hover:text-white"
          >
            Log in
          </Link>
        </div>
      </header>

      <div className="savis-app-content max-w-lg mx-auto pb-20">
        {/* Intro */}
        <div className="text-center mb-7 pt-1">
          <span className="savis-red-pill">JOIN FREE</span>
          <h1 className="mt-4 text-[1.85rem] sm:text-[2.15rem] font-black tracking-tight leading-[1.1]">
            How will you use
            <br />
            <strong>SAVIS</strong>?
          </h1>
          <p className="mt-2.5 text-sm text-white/55 max-w-sm mx-auto leading-relaxed">
            Choose your path. Switch anytime from your profile later.
          </p>
        </div>

        {/* Role cards — Consumer first */}
        <div className="grid grid-cols-2 gap-2.5 mb-5" role="tablist" aria-label="Join as">
          <button
            type="button"
            role="tab"
            aria-selected={!isProvider}
            onClick={() => setMode("consumer")}
            className={`relative rounded-2xl border p-3.5 text-left transition ${
              !isProvider
                ? "border-[#E22227]/55 bg-gradient-to-b from-[#E22227]/20 to-white/[0.03] shadow-[0_0_0_1px_rgba(226,34,39,0.25),0_12px_40px_rgba(226,34,39,0.15)]"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            {!isProvider && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#E22227] shadow-[0_0_0_3px_rgba(226,34,39,0.25)]" />
            )}
            <span className="block text-xl mb-1.5" aria-hidden>
              📍
            </span>
            <span className="block text-[0.78rem] font-black tracking-wide">
              Consumer
            </span>
            <span className="block text-[0.68rem] text-white/45 mt-0.5 leading-snug">
              Book local services
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={isProvider}
            onClick={() => setMode("provider")}
            className={`relative rounded-2xl border p-3.5 text-left transition ${
              isProvider
                ? "border-[#E22227]/55 bg-gradient-to-b from-[#E22227]/20 to-white/[0.03] shadow-[0_0_0_1px_rgba(226,34,39,0.25),0_12px_40px_rgba(226,34,39,0.15)]"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            {isProvider && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#E22227] shadow-[0_0_0_3px_rgba(226,34,39,0.25)]" />
            )}
            <span className="block text-xl mb-1.5" aria-hidden>
              🔧
            </span>
            <span className="block text-[0.78rem] font-black tracking-wide">
              Provider
            </span>
            <span className="block text-[0.68rem] text-white/45 mt-0.5 leading-snug">
              Earn from your skill
            </span>
          </button>
        </div>

        {/* Dynamic detail panel */}
        <section className="savis-hero-card !min-h-0 mb-4">
          <div className="relative z-[2] w-full p-5 sm:p-6">
            <p className="text-[0.65rem] font-black tracking-[0.18em] text-[#F5C451]">
              {isProvider ? "EARN ON SAVIS" : "BOOK WITH CONFIDENCE"}
            </p>
            <h2 className="mt-1.5 text-[1.35rem] sm:text-xl font-black leading-snug">
              {isProvider ? (
                <>
                  Get real jobs.
                  <br />
                  Get paid safely.
                </>
              ) : (
                <>
                  Find pros near you.
                  <br />
                  Pay only when done.
                </>
              )}
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {(isProvider
                ? ["Verified", "Low fees", "Protected payouts"]
                : ["Escrow", "Nearby", "Chat"]
              ).map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/25 px-3 py-1.5 text-[0.68rem] font-bold text-white/80"
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
        <ul className="space-y-2 mb-6">
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
              <Link
                href="/login"
                className="font-bold text-[#F5C451] hover:underline"
              >
                Log in
              </Link>
            </>
          )}
        </p>

        <p className="text-center mt-8">
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
