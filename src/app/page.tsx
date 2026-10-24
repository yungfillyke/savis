"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import CategoryStrip from "@/components/CategoryStrip";

type Provider = {
  id: string;
  name: string;
  skill: string;
  area: string;
  km: number;
  rating: number;
  reviews: number;
  rate: number;
  verified: boolean;
  avatarUrl?: string;
  bio?: string;
  available?: string;
};

function mapRow(r: Record<string, unknown>): Provider {
  return {
    id: String(r.id),
    name: String(r.full_name || "SAVIS provider"),
    skill: String(r.service_category || "General help"),
    area: String(r.location_name || "Nearby"),
    km: Number(r.distance_km) || 0,
    rating: Number(r.rating) || 0,
    reviews: Number(r.review_count) || 0,
    rate: Number(r.hourly_rate) || 0,
    verified:
      Boolean(r.verified) || String(r.verification_status) === "verified",
    avatarUrl: r.avatar_url ? String(r.avatar_url) : undefined,
    bio: r.bio ? String(r.bio) : undefined,
    available: r.availability ? String(r.availability) : "Available",
  };
}

export default function HomePage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [items, setItems] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const coords = { latitude: -1.286389, longitude: 36.817223 };

  useEffect(() => {
    const s = createClient();
    void s.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/consumer");
    });
  }, [router]);

  useEffect(() => {
    let stop = false;
    async function load() {
      setLoading(true);
      const s = createClient();
      const { data, error } = await s.rpc("search_public_providers", {
        p_lat: coords.latitude,
        p_lng: coords.longitude,
        p_radius_km: 25,
        p_category: cat || null,
        p_query: q.trim() || null,
        p_limit: 24,
      });
      if (stop) return;
      if (!error && data?.length) {
        setItems((data as Record<string, unknown>[]).map(mapRow));
        setLive(true);
      } else {
        // Never show fictional providers on the public landing page.
        setItems([]);
        setLive(false);
      }
      setLoading(false);
    }
    void load();
    return () => {
      stop = true;
    };
  }, [cat, q]);

  const filtered = useMemo(() => {
    return [...items].sort(
      (a, b) => a.km - b.km || a.name.localeCompare(b.name)
    );
  }, [items]);

  return (
    <main className="savis-app-shell savis-public-light min-h-screen pb-24">
      <header className="savis-app-header">
        <div
          className="savis-app-header-inner"
          style={{ gridTemplateColumns: "auto 1fr auto auto" }}
        >
          <Link href="/" className="savis-logo-button" aria-label="SAVIS home">
            <Logo size="sm" />
          </Link>
          <div className="savis-app-search">
            <span>⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  document
                    .getElementById("nearby-results")
                    ?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              placeholder="Search services, products..."
              aria-label="Search services and products"
            />
          </div>
          <Link
            href="/login"
            className="text-xs font-bold text-white/70 px-2 py-2 whitespace-nowrap hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/join"
            className="rounded-full bg-gradient-to-r from-[#E22227] to-[#C7080C] px-3 py-2 text-xs font-black text-white whitespace-nowrap"
          >
            Join
          </Link>
        </div>
      </header>

      <div className="savis-app-content">
        <section className="savis-hero-card">
          <div className="savis-hero-copy">
            <span className="savis-red-pill">SAVIS</span>
            <h1>
              Discover Local
              <br />
              <strong>Services & Products</strong>
            </h1>
            <p>
              Browse trusted professionals near you. Create a free account when
              you are ready to message, book or pay.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("nearby-results")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="savis-primary-button"
              >
                BROWSE NOW <span>→</span>
              </button>
            </div>
          </div>
          <div className="savis-hero-art" aria-hidden="true">
            <div
              className="savis-hero-art-photo"
              style={{ backgroundImage: "url(/images/savis-services-hero.jpg)" }}
            />
          </div>
        </section>

        <CategoryStrip
          activeSubId={
            cat ? cat.toLowerCase().replace(/\s+/g, "-") : undefined
          }
          onSelectSub={(sub) => {
            const primary = sub.tags[0] || sub.label;
            setCat(primary);
            setQ("");
            setTimeout(
              () =>
                document
                  .getElementById("nearby-results")
                  ?.scrollIntoView({ behavior: "smooth" }),
              80
            );
          }}
        />

        <section id="nearby-results" className="savis-provider-section">
          <div className="savis-section-heading">
            <div>
              <span>DISCOVER</span>
              <h2>
                {q || cat
                  ? `Results (${filtered.length})`
                  : "People near you"}
              </h2>
              <p>
                {live
                  ? "Live provider listings from SAVIS"
                  : "Real provider listings will appear here as providers join SAVIS."}
              </p>
            </div>
            {(q || cat) && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setCat("");
                }}
                style={{
                  fontSize: ".75rem",
                  fontWeight: 900,
                  color: "#F5C451",
                  background: "none",
                  border: 0,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="savis-provider-list">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="savis-provider-row"
                  style={{ opacity: 0.5, minHeight: 72 }}
                />
              ))}
            </div>
          ) : (
            <div className="savis-provider-list">
              {filtered.slice(0, 12).map((p) => (
                <Link
                  key={p.id}
                  href={`/consumer/provider/${p.id}`}
                  className="savis-provider-row"
                >
                  <div className="savis-provider-row-avatar">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" loading="lazy" />
                    ) : (
                      <span>{p.name.charAt(0)}</span>
                    )}
                    <i
                      className={
                        (p.available || "")
                          .toLowerCase()
                          .includes("now") ||
                        (p.available || "")
                          .toLowerCase()
                          .includes("today")
                          ? "is-online"
                          : ""
                      }
                    />
                  </div>
                  <div className="savis-provider-row-main">
                    <div className="savis-provider-row-line1">
                      <b>{p.name}</b>
                      <span className="savis-provider-row-rating">
                        ★ {p.rating ? p.rating.toFixed(1) : "New"}
                        {p.reviews ? ` (${p.reviews})` : ""}
                      </span>
                    </div>
                    <div className="savis-provider-row-line2">
                      {p.skill} · {p.km.toFixed(1)} km away
                    </div>
                    <div className="savis-provider-row-line3">
                      {p.verified ? (
                        <em>Verified Fundi</em>
                      ) : (
                        <em>SAVIS Provider</em>
                      )}
                      <span>· {p.area}</span>
                    </div>
                  </div>
                  <span className="savis-provider-row-action">VIEW</span>
                </Link>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="savis-empty-state">
              No providers match this search yet. Try another category or clear
              filters.
            </div>
          )}
        </section>

        <section
          className="mt-6 mb-4 rounded-[20px] border border-white/10 p-5"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <span className="text-[0.65rem] font-black tracking-widest text-[#F5C451]">
            JOIN FREE
          </span>
          <h2 className="text-lg font-black mt-1">
            Ready to message, book & pay securely?
          </h2>
          <p className="text-sm text-white/55 mt-1">
            Create a free SAVIS account to request quotes, chat with providers
            and use protected payments.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link
              href="/join"
              className="rounded-full bg-gradient-to-r from-[#E22227] to-[#C7080C] px-5 py-2.5 text-sm font-black text-white"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80"
            >
              Log in
            </Link>
            <Link
              href="/join"
              className="rounded-full border border-[#F5C451]/30 px-5 py-2.5 text-sm font-bold text-[#F5C451]"
            >
              Offer services
            </Link>
          </div>
        </section>

        <footer className="border-t border-white/10 pt-6 pb-4 text-center">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} SAVIS ·{" "}
            <Link href="/about" className="text-white/55">
              About
            </Link>{" "}
            ·{" "}
            <Link href="/terms" className="text-white/55">
              Terms
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="text-white/55">
              Privacy
            </Link>
          </p>
        </footer>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 px-4 py-3"
        style={{
          background: "rgba(17,23,28,0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <p className="text-xs text-white/50 leading-tight">
            Browsing as guest.
            <br />
            <span className="text-white/80 font-semibold">
              Join free to book & message.
            </span>
          </p>
          <Link
            href="/join"
            className="shrink-0 rounded-full bg-gradient-to-r from-[#E22227] to-[#C7080C] px-4 py-2.5 text-xs font-black text-white"
          >
            Get started
          </Link>
        </div>
      </div>
    </main>
  );
}
