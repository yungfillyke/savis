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
  "Get Verified Badge",
  "Low Commission",
  "Exclusive Jobs",
  "Premium Support",
];

const CONSUMER_PERKS = [
  "Trusted local providers",
  "Protected payments",
  "Quotes & messaging",
  "Track jobs easily",
];

export default function JoinPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("provider");
  const [category, setCategory] = useState("Plumber");
  const [catOpen, setCatOpen] = useState(false);

  const isProvider = mode === "provider";

  const signupHref = useMemo(() => {
    if (isProvider) {
      return `/signup?role=provider&category=${encodeURIComponent(category)}`;
    }
    return "/signup?role=consumer";
  }, [isProvider, category]);

  function continueJoin() {
    router.push(signupHref);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-[#e8f1f4] via-[#f4f8fa] to-[#eef3f6]">
      <div className="w-full max-w-[400px]">
        {/* Phone-style card matching the concept */}
        <div className="rounded-[2rem] border border-[#c5d5dc]/60 bg-white shadow-[0_20px_60px_rgba(15,40,55,0.12)] overflow-hidden">
          <div className="px-5 pt-6 pb-2 flex justify-center">
            <Logo size="sm" showTagline={false} />
          </div>

          {/* Segmented control */}
          <div className="px-5 pt-4">
            <div
              className="flex rounded-full bg-[#e8eef1] p-1"
              role="tablist"
              aria-label="Join as"
            >
              <button
                type="button"
                role="tab"
                aria-selected={isProvider}
                onClick={() => setMode("provider")}
                className={`flex-1 rounded-full py-2.5 text-[0.7rem] font-black tracking-wide transition ${
                  isProvider
                    ? "bg-[#2a6b7a] text-white shadow-sm"
                    : "text-[#5a6f78]"
                }`}
              >
                BECOME A PROVIDER
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isProvider}
                onClick={() => setMode("consumer")}
                className={`flex-1 rounded-full py-2.5 text-[0.7rem] font-black tracking-wide transition ${
                  !isProvider
                    ? "bg-[#2a6b7a] text-white shadow-sm"
                    : "text-[#5a6f78]"
                }`}
              >
                JOIN AS CONSUMER
              </button>
            </div>
          </div>

          {/* Dynamic hero card */}
          <div className="px-5 pt-4">
            <div
              className={`relative rounded-[1.4rem] overflow-hidden border ${
                isProvider
                  ? "border-[#b8d4dc] bg-gradient-to-br from-[#d4e8ee] via-[#c5dde6] to-[#a8c9d6]"
                  : "border-[#d4c8e8] bg-gradient-to-br from-[#e8e0f4] via-[#ddd4f0] to-[#c8bce4]"
              }`}
            >
              <div className="p-5 min-h-[180px] flex items-center justify-center relative">
                {/* Soft city / network backdrop */}
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 20% 30%, rgba(255,255,255,.7) 0 1px, transparent 1.5px), radial-gradient(circle at 70% 60%, rgba(255,255,255,.5) 0 1px, transparent 1.5px)",
                    backgroundSize: "40px 40px, 55px 55px",
                  }}
                />

                {isProvider ? (
                  <div className="relative z-[1] flex items-end gap-3 scale-[1.05]">
                    <span className="text-4xl" aria-hidden>
                      🧰
                    </span>
                    <span className="text-5xl" aria-hidden>
                      💻
                    </span>
                    <span className="text-3xl self-start" aria-hidden>
                      ☕
                    </span>
                  </div>
                ) : (
                  <div className="relative z-[1] flex items-end gap-3 scale-[1.05]">
                    <span className="text-4xl" aria-hidden>
                      🔍
                    </span>
                    <span className="text-5xl" aria-hidden>
                      🏠
                    </span>
                    <span className="text-3xl self-start" aria-hidden>
                      ⭐
                    </span>
                  </div>
                )}

                {/* Floating perk chips (right side, concept-style) */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                  {(isProvider
                    ? [
                        { icon: "✓", label: "Verified" },
                        { icon: "$", label: "Fees" },
                        { icon: "★", label: "Rewards" },
                      ]
                    : [
                        { icon: "🛡", label: "Safe pay" },
                        { icon: "📍", label: "Nearby" },
                        { icon: "💬", label: "Chat" },
                      ]
                  ).map((chip) => (
                    <div
                      key={chip.label}
                      className="flex items-center gap-1.5 rounded-full bg-white/90 border border-white shadow-sm pl-1.5 pr-2.5 py-1"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#2a6b7a] text-white text-[0.65rem] font-black flex items-center justify-center">
                        {chip.icon}
                      </span>
                      <span className="text-[0.62rem] font-bold text-[#2a4550]">
                        {chip.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Category (provider only) + perks + CTA */}
          <div className="px-5 pt-4 pb-6">
            {isProvider && (
              <div className="mb-3 relative">
                <button
                  type="button"
                  onClick={() => setCatOpen((v) => !v)}
                  className="w-full flex items-center justify-between rounded-2xl border border-[#d0dde3] bg-[#f7fafb] px-4 py-3 text-left"
                >
                  <span className="text-[0.7rem] font-black tracking-wide text-[#3a525c]">
                    SELECTED CATEGORY:{" "}
                    <span className="text-[#1a3038]">{category.toUpperCase()}</span>
                  </span>
                  <span className="text-[#5a6f78] text-xs">{catOpen ? "▴" : "▾"}</span>
                </button>
                {catOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 rounded-2xl border border-[#d0dde3] bg-white shadow-lg max-h-48 overflow-auto">
                    {PROVIDER_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCategory(c);
                          setCatOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-[#f0f6f8] ${
                          c === category
                            ? "text-[#2a6b7a] bg-[#eef6f8]"
                            : "text-[#2a3d45]"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ul className="space-y-2 mb-5">
              {(isProvider ? PROVIDER_PERKS : CONSUMER_PERKS).map((perk) => (
                <li
                  key={perk}
                  className="flex items-center gap-2.5 text-sm font-semibold text-[#243840]"
                >
                  <span className="w-5 h-5 rounded-full bg-[#2a6b7a]/12 text-[#2a6b7a] flex items-center justify-center text-xs font-black shrink-0">
                    ✓
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={continueJoin}
              className="w-full rounded-full bg-[#2a6b7a] hover:bg-[#245f6c] text-white font-black text-sm py-3.5 tracking-wide shadow-md transition flex items-center justify-center gap-2"
            >
              {isProvider ? "JOIN SAVIS AS A PROVIDER" : "JOIN SAVIS AS A CONSUMER"}
              <span aria-hidden>↑</span>
            </button>

            <p className="text-center text-[0.72rem] text-[#6a7f88] mt-4">
              {isProvider ? (
                <>
                  Representing a Firm or Company?{" "}
                  <Link
                    href="/signup?role=provider&type=business"
                    className="font-bold text-[#2a6b7a] underline underline-offset-2"
                  >
                    Work with SAVIS
                  </Link>
                  .
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-[#2a6b7a] underline underline-offset-2"
                  >
                    Log in
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <p className="text-center mt-5">
          <Link href="/" className="text-sm font-semibold text-[#5a6f78] hover:text-[#2a4550]">
            ← Back to browse
          </Link>
        </p>
      </div>
    </main>
  );
}
