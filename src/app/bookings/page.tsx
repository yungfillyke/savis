"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SavisBottomNav from "@/components/SavisBottomNav";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import {
  getBookings,
  syncBookings,
  type Booking,
  type BookingStatus,
} from "@/lib/bookings";
import { getReviewForJob, addReview } from "@/lib/reviews";
import { acceptQuote, listQuotesForJobs, type Quote } from "@/lib/quotes";
import LangToggle from "@/components/LangToggle";
import { t, getLang, setLang, type Lang } from "@/lib/i18n";

const URGENCY_LABEL: Record<string, string> = {
  now: "Right now",
  today: "Today",
  week: "This week",
};

const STATUS: Record<
  BookingStatus,
  { label: string; className: string; hint: string }
> = {
  requested: {
    label: "Waiting for provider",
    className:
      "text-[#F5C451] bg-[rgba(245,196,81,0.12)] border-[rgba(245,196,81,0.4)]",
    hint: "Your request was sent. The provider will respond soon.",
  },
  declined: {
    label: "Declined",
    className:
      "text-[#ff8a8d] bg-[rgba(255,138,141,0.12)] border-[rgba(255,138,141,0.4)]",
    hint: "This provider declined. Try another nearby.",
  },
  quote_pending: {
    label: "Quote received",
    className: "text-[#F5C451] bg-[#F5C451]/10 border-[#F5C451]/30",
    hint: "Review the provider quote below. Accept it to lock the job.",
  },
  accepted: {
    label: "Accepted · Protected",
    className: "text-[#34D399] bg-[#34D399]/10 border-[#34D399]/30",
    hint: "The quote is accepted and the job is protected in the SAVIS ledger.",
  },
  en_route: {
    label: "Provider en route",
    className: "text-[#60A5FA] bg-[#60A5FA]/10 border-[#60A5FA]/30",
    hint: "Your provider is on the way.",
  },
  in_progress: {
    label: "In progress",
    className: "text-[#34D399] bg-[#34D399]/10 border-[#34D399]/30",
    hint: "Work is currently in progress.",
  },
  rescheduled: {
    label: "Rescheduled",
    className: "text-[#F5C451] bg-[#F5C451]/10 border-[#F5C451]/30",
    hint: "The job has a new proposed schedule.",
  },
  cancelled: {
    label: "Cancelled",
    className: "text-[#ff8a8d] bg-[#ff8a8d]/10 border-[#ff8a8d]/30",
    hint: "This job was cancelled.",
  },
  completed: {
    label: "Completed",
    className: "text-[#B9C3C9] bg-white/5 border-white/15",
    hint: "Job finished. Leave a rating if you haven’t yet.",
  },
};

export default function BookingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ratingJobId, setRatingJobId] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [lang, setLangState] = useState<Lang>("en");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteBusy, setQuoteBusy] = useState<string | null>(null);

  useEffect(() => {
    setLangState(getLang());
  }, []);

  function switchLang(l: Lang) {
    setLang(l);
    setLangState(l);
  }

  function refreshReviews(list: Booking[]) {
    const map: Record<string, boolean> = {};
    list.forEach((b) => {
      if (getReviewForJob(b.id)) map[b.id] = true;
    });
    setReviewed(map);
  }

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      await syncBookings();
      const list = getBookings();
      const quoteList = await listQuotesForJobs(list.map((booking) => booking.id));
      setQuotes(quoteList);
      setBookings(list);
      refreshReviews(list);
      setLoading(false);
    }
    check();

    function onUpdate() {
      const list = getBookings();
      setBookings(list);
      refreshReviews(list);
    }
    window.addEventListener("savis-bookings-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("savis-bookings-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [router]);

  async function handleAcceptQuote(quoteId: string) {
    setQuoteBusy(quoteId);
    const result = await acceptQuote(quoteId);
    if (result.ok) {
      await syncBookings();
      const list = getBookings();
      setBookings(list);
      setQuotes(await listQuotesForJobs(list.map((booking) => booking.id)));
    }
    setQuoteBusy(null);
  }

  async function submitReview() {
    if (!ratingJobId) return;
    setSaving(true);
    await addReview(ratingJobId, stars, comment);
    setReviewed((r) => ({ ...r, [ratingJobId]: true }));
    setRatingJobId(null);
    setComment("");
    setStars(5);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[#B9C3C9]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[rgba(34,43,49,0.8)] backdrop-blur-md">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} onChange={switchLang} />
          <span className="text-xs font-bold px-3 py-1.5 rounded-full text-[#F5C451] bg-[rgba(245,196,81,0.12)] border border-[rgba(245,196,81,0.35)]">
            {t("bookings", lang)}
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-2xl font-extrabold mb-1">{t("my.bookings", lang)}</h1>
        <p className="text-[#B9C3C9] text-sm mb-6">{t("track.requests", lang)}</p>

        {bookings.length === 0 ? (
          <div className="text-center py-12 px-5 rounded-[20px] border border-dashed border-white/15 bg-[rgba(34,43,49,0.5)] mb-6">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-bold text-sm mb-1">{t("no.bookings", lang)}</p>
            <p className="text-xs text-[#B9C3C9] mb-5 leading-relaxed">{t("empty.guide", lang)}</p>
            <div className="text-left max-w-xs mx-auto space-y-2 text-xs text-[#B9C3C9]">
              <p><span className="text-[#F5C451] font-bold">1.</span> Search or pick a category</p>
              <p><span className="text-[#F5C451] font-bold">2.</span> Open a provider and request a quote</p>
              <p><span className="text-[#F5C451] font-bold">3.</span> Track progress on this page</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {bookings.map((b) => {
              const st = STATUS[b.status] || STATUS.requested;
              const hasReview = reviewed[b.id];
              return (
                <div key={b.id} className="p-4 rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div className="font-bold">{b.providerName}</div>
                    <span className={`text-[0.65rem] font-bold px-2.5 py-1 rounded-full border shrink-0 text-center max-w-[9.5rem] ${st.className}`}>{st.label}</span>
                  </div>
                  <div className="text-xs text-[#B9C3C9] mb-2">{b.skill} · {b.location} · {URGENCY_LABEL[b.urgency] || b.urgency}</div>
                  <p className="text-sm text-[#B9C3C9] mb-2">{b.description}</p>
                  <div className="text-sm font-bold text-[#F5C451] mb-2">From KSh {b.rate.toLocaleString()}</div>
                  <p className="text-[0.7rem] text-[#55666E] mb-2">{st.hint}</p>

                  {quotes.filter((quote) => quote.jobId === b.id && quote.status === "pending").map((quote) => (
                    <div key={quote.id} className="mb-3 rounded-2xl border border-[#F5C451]/30 bg-[#F5C451]/[0.06] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[#F5C451]">Provider quote</span>
                        <span className="text-[0.62rem] text-[#B9C3C9]">Expires {quote.expiresAt ? new Date(quote.expiresAt).toLocaleString() : "soon"}</span>
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <div>
                          <b className="text-xl text-white">KSh {quote.amount.toLocaleString()}</b>
                          <p className="mt-1 text-xs text-[#B9C3C9]">{quote.message || "Provider sent a quote for this job."}</p>
                        </div>
                        <span className="rounded-full bg-[#34D399]/10 px-2.5 py-1 text-[0.62rem] font-bold text-[#34D399]">Protected</span>
                      </div>
                      <button type="button" disabled={quoteBusy === quote.id} onClick={() => handleAcceptQuote(quote.id)} className="mt-3 w-full rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] py-2.5 text-xs font-bold">
                        {quoteBusy === quote.id ? "Locking job…" : "Accept & Lock Job"}
                      </button>
                    </div>
                  ))}

                  {b.status === "completed" && !hasReview && (
                    <button
                      onClick={() => { setRatingJobId(b.id); setStars(5); setComment(""); }}
                      className="w-full mt-1 py-2.5 rounded-full text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #E22227, #C7080C)" }}
                    >
                      {`★ ${t("rate.job", lang)}`}
                    </button>
                  )}
                  {b.status === "completed" && hasReview && (
                    <p className="text-xs text-[#34D399] font-semibold mt-1">✓ Thanks for your review</p>
                  )}
                  {b.status === "declined" && (
                    <Link href="/consumer" className="inline-block mt-1 text-xs font-bold text-[#F5C451]">Find another provider →</Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Link href="/consumer">
          <Button full>{t("find.provider", lang)}</Button>
        </Link>
      </div>

      {ratingJobId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-6">
          <div className="w-full max-w-md p-5 rounded-[24px] border border-white/15 bg-[#222B31] shadow-2xl">
            <h2 className="font-extrabold text-lg mb-1">Rate this job</h2>
            <p className="text-sm text-[#B9C3C9] mb-4">Your feedback helps the SAVIS community.</p>
            <div className="flex gap-2 justify-center mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setStars(n)} className={`text-3xl transition ${n <= stars ? "opacity-100" : "opacity-30"}`}>★</button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Optional comment…" className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/15 text-white outline-none focus:border-[#E22227] resize-none mb-4 text-sm" />
            <Button full onClick={submitReview} disabled={saving}>{saving ? "Saving…" : "Submit review"}</Button>
            <button type="button" onClick={() => setRatingJobId(null)} className="w-full text-sm text-[#B9C3C9] py-3 mt-1">Cancel</button>
          </div>
        </div>
      )}

      <SavisBottomNav active="jobs" />
    </main>
  );
}
