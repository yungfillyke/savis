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
  syncConsumerBookings,
  updateConsumerJobRequest,
  updateBookingStatus,
  type Booking,
  type BookingStatus,
} from "@/lib/bookings";
import { getReviewForJob, addReview } from "@/lib/reviews";
import { acceptQuote, declineQuote, listQuotesForJobs, type Quote } from "@/lib/quotes";
import LangToggle from "@/components/LangToggle";
import { t, getLang, setLang, type Lang } from "@/lib/i18n";

const URGENCY_LABEL: Record<string, string> = {
  now: "As soon as possible",
  asap: "As soon as possible",
  today: "Today",
  week: "This week",
  custom: "Choose a date & time",
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
    label: "Accepted",
    className: "text-[#34D399] bg-[#34D399]/10 border-[#34D399]/30",
    hint: "The job is accepted. Confirm the final price and payment method with the provider before work begins.",
  },
  en_route: {
    label: "Provider en route",
    className: "text-[#60A5FA] bg-[#60A5FA]/10 border-[#60A5FA]/30",
    hint: "Your provider is on the way.",
  },
  arrived: {
    label: "Provider arrived",
    className: "text-[#60A5FA] bg-[#60A5FA]/10 border-[#60A5FA]/30",
    hint: "Your provider has arrived. They can now start the work.",
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
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editUrgency, setEditUrgency] = useState("today");
  const [editScheduledFor, setEditScheduledFor] = useState("");

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
      await syncConsumerBookings();
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
    try {
      const result = await acceptQuote(quoteId);
      if (!result.ok) throw new Error(result.error || "Could not accept this quote.");
      await syncConsumerBookings();
      const list = getBookings();
      setBookings(list);
      setQuotes(await listQuotesForJobs(list.map((booking) => booking.id)));
      setActionMessage("Quote accepted. Your job is confirmed.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not accept this quote.");
    } finally {
      setQuoteBusy(null);
    }
  }

  async function handleDeclineQuote(quoteId: string) {
    setQuoteBusy(quoteId);
    try {
      const result = await declineQuote(quoteId);
      if (!result.ok) throw new Error(result.error || "Could not decline this quote.");
      await syncConsumerBookings();
      const list = getBookings();
      setBookings(list);
      setQuotes(await listQuotesForJobs(list.map((booking) => booking.id)));
      setActionMessage("Quote declined. You can message the provider to discuss the price.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not decline this quote.");
    } finally {
      setQuoteBusy(null);
    }
  }

  async function handleCancelJob(jobId: string) {
    setQuoteBusy(jobId);
    try {
      await updateBookingStatus(jobId, "cancelled", "Cancelled by customer.");
      await syncConsumerBookings();
      const list = getBookings();
      setBookings(list);
      setQuotes(await listQuotesForJobs(list.map((booking) => booking.id)));
      setActionMessage("Job cancelled.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not cancel this job.");
      await syncConsumerBookings();
      setBookings(getBookings());
    } finally {
      setQuoteBusy(null);
    }
  }

  function beginEdit(b: Booking) {
    setEditJobId(b.id);
    setEditDescription(b.description || "");
    setEditLocation(b.location || "");
    setEditUrgency(b.urgency || "today");
    setEditScheduledFor(b.scheduledFor ? new Date(b.scheduledFor).toISOString().slice(0, 16) : "");
    setDetailJobId(null);
  }

  async function saveEditedRequest() {
    if (!editJobId) return;
    setQuoteBusy(editJobId);
    try {
      await updateConsumerJobRequest(editJobId, {
        description: editDescription.trim(),
        location: editLocation.trim(),
        urgency: editUrgency,
        scheduledFor: editScheduledFor || undefined,
      });
      const list = getBookings();
      setBookings(list);
      setQuotes(await listQuotesForJobs(list.map((booking) => booking.id)));
      setEditJobId(null);
      setActionMessage("Request updated. Any earlier pending quote was cancelled; the provider must send a fresh quote.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update this request.");
    } finally {
      setQuoteBusy(null);
    }
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
          <div className="space-y-6 mb-6">
            {[{ title: "New · Current jobs", items: bookings.filter((b) => !["completed", "declined", "cancelled"].includes(b.status)) }, { title: "Older · Past jobs", items: bookings.filter((b) => ["completed", "declined", "cancelled"].includes(b.status)) }].filter((group) => group.items.length > 0).map((group) => (
              <section key={group.title} className="space-y-3">
                <h2 className="text-sm font-extrabold tracking-wide text-[#F5C451]">{group.title}</h2>
                {group.items.map((b) => {
              const st = STATUS[b.status] || STATUS.requested;
              const hasReview = reviewed[b.id];
              return (
                <div key={b.id} className="p-4 rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)]">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div className="font-bold">Job #{b.id.slice(-4).toUpperCase()}</div>
                    <span className={`text-[0.65rem] font-bold px-2.5 py-1 rounded-full border shrink-0 text-center max-w-[9.5rem] ${st.className}`}>{st.label}</span>
                  </div>
                  <p className="text-[0.7rem] text-[#B9C3C9] mb-2">{st.hint}</p>
                  {quotes.filter((quote) => quote.jobId === b.id && quote.status !== "cancelled").sort((x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime()).map((quote, quoteIndex) => (
                    <div key={quote.id} className="mb-3 rounded-2xl border border-[#F5C451]/30 bg-[#F5C451]/[0.06] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[#F5C451]">{quote.status === "accepted" ? "Accepted quote · agreed receipt" : quote.status === "declined" ? `Quote ${quoteIndex + 1} · Declined` : quote.status === "expired" ? `Quote ${quoteIndex + 1} · Expired` : quoteIndex > 0 ? `Replacement quote ${quoteIndex + 1}` : "Provider quote"}</span>
                        {quote.status === "pending" && <span className="text-[0.62rem] text-[#B9C3C9]">Expires {quote.expiresAt ? new Date(quote.expiresAt).toLocaleString() : "soon"}</span>}
                      </div>
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[#B9C3C9]">Quote receipt · Job #{b.id.slice(-4).toUpperCase()}</p>
                        <p className="mt-2 text-xs text-[#B9C3C9]">Provider's proposed total</p>
                        <b className="mt-1 block text-2xl text-white">KSh {quote.amount.toLocaleString()}</b>
                        <div className="mt-3 border-t border-white/10 pt-3">
                          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[#B9C3C9]">Items included</p>
                          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-white">
                            {(quote.message || "").split("\n").filter((line) => /^\d+\.\s/.test(line)).map((line, index) => <li key={index}>{line.replace(/^\d+\.\s*/, "")}</li>)}
                          </ol>
                          {!(quote.message || "").split("\n").some((line) => /^\\d+\\.\\s/.test(line)) && <p className="mt-2 text-sm text-[#B9C3C9]">The provider has not itemized this quote yet. Ask them to clarify the charges before accepting.</p>}
                          {(quote.message || "").split("\n").filter((line) => /^(Service fee:|SAVIS fee:|Company fee:|Labour:|Labor:)/i.test(line)).map((line, index) => <p key={index} className="mt-2 text-xs text-[#B9C3C9]">{line}</p>)}
                          {(() => { const note = (quote.message || "").split("\n").find((line) => line.startsWith("Provider note:")); return note ? <div className="mt-3 rounded-xl border border-[#F5C451]/25 bg-[#F5C451]/[0.08] p-3"><p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[#F5C451]">Provider note</p><p className="mt-1 text-sm text-white">{note.replace("Provider note: ", "")}</p></div> : null; })()}
                        </div>
                        <div className="mt-4 border-t border-white/10 pt-3"><div className="flex items-center justify-between font-extrabold text-white"><span>Total</span><span>KSh {quote.amount.toLocaleString()}</span></div><p className="mt-2 text-[0.65rem] text-[#B9C3C9]">{quote.status === "accepted" ? "This is the agreed amount for this job." : quote.status === "declined" ? "You declined this quote. It remains here for your records; request a fresh quote if you still want to proceed." : quote.status === "expired" ? "This quote expired and is kept here for your records." : "This becomes the agreed amount when you accept the quote."}</p>{!(quote.message || "").split("\n").some((line) => /^\\d+\\.\\s/.test(line)) && <p className="mt-3 text-xs text-[#F5C451]">The provider has not itemized this quote yet. Ask them to clarify the charges before accepting.</p>}</div>
                      </div>
                      {quote.status === "pending" && <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" disabled={quoteBusy === quote.id} onClick={() => handleAcceptQuote(quote.id)} className="rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] py-2.5 text-xs font-bold disabled:opacity-50">
                          {quoteBusy === quote.id ? "Saving…" : "Accept & Lock Job"}
                        </button>
                        <button type="button" disabled={quoteBusy === quote.id} onClick={() => handleDeclineQuote(quote.id)} className="rounded-full border border-red-300 py-2.5 text-xs font-bold text-red-300 disabled:opacity-50">
                          {quoteBusy === quote.id ? "Saving…" : "Decline quote"}
                        </button>
                      </div>}
                    </div>
                  ))}

                  {b.status !== "quote_pending" && b.rate > 0 && !quotes.some((quote) => quote.jobId === b.id && quote.status === "accepted") && (
                    <div className="mb-2 text-sm font-bold text-[#F5C451]">
                      {["accepted", "en_route", "arrived", "in_progress", "completed"].includes(b.status) ? "Agreed amount" : "Current amount"}: KSh {b.rate.toLocaleString()}
                    </div>
                  )}
                  <button type="button" onClick={() => setDetailJobId(b.id)} className="mb-2 w-full rounded-full border border-white/15 py-2.5 text-xs font-bold text-white">View Job Details</button>
                  {(b.status !== "quote_pending") && <button type="button" onClick={() => router.push(`/messages/chat?job=${b.id}`)} className="mb-3 w-full rounded-full border border-white/15 py-2.5 text-xs font-bold text-[#F5C451]">{b.status === "completed" ? "View message history" : "Message provider"}</button>}
                  {["requested", "quote_pending"].includes(b.status) && <button type="button" onClick={() => beginEdit(b)} className="mb-2 w-full rounded-full border border-[#F5C451]/40 py-2.5 text-xs font-bold text-[#F5C451]">Edit job request</button>}

                  {["requested", "quote_pending", "accepted"].includes(b.status) && (
                    <button
                      type="button"
                      disabled={quoteBusy === b.id}
                      onClick={() => void handleCancelJob(b.id)}
                      className="w-full mt-2 rounded-full border border-red-300 py-2.5 text-xs font-bold text-red-300 disabled:opacity-50"
                    >
                      {quoteBusy === b.id ? "Cancelling…" : "Cancel job"}
                    </button>
                  )}

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
              </section>
            ))}
          </div>
        )}

        {actionMessage && (
          <div role="status" className="mb-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white">
            {actionMessage}
            <button type="button" onClick={() => setActionMessage(null)} className="ml-3 font-bold text-[#F5C451]">Dismiss</button>
          </div>
        )}

        <Link href="/consumer">
          <Button full>{t("find.provider", lang)}</Button>
        </Link>
      </div>

      {detailJobId && (() => {
        const b = bookings.find((item) => item.id === detailJobId);
        if (!b) return null;
        return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 pt-4 pb-28 sm:py-6" role="dialog" aria-modal="true" aria-label="Job details">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto p-5 rounded-[24px] border border-white/15 bg-[#222B31] shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-extrabold text-lg">Job details</h2><p className="text-xs text-[#B9C3C9] mt-1">Job #{b.id.slice(-4).toUpperCase()}</p></div><button type="button" onClick={() => setDetailJobId(null)} className="text-[#B9C3C9] text-sm">Close</button></div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3"><p className="text-xs uppercase tracking-wide text-[#B9C3C9]">Current job status</p><p className={`mt-1 font-extrabold ${STATUS[b.status]?.className || ""}`}>{STATUS[b.status]?.label || b.status}</p><p className="mt-1 text-xs text-[#B9C3C9]">{STATUS[b.status]?.hint || "Check this page for updates."}</p></div>
            <div className="mt-4 space-y-4 text-sm">
              <div><p className="text-xs text-[#B9C3C9] mb-1">Work requested</p><p className="whitespace-pre-wrap">{b.description || "No description supplied."}</p></div>
              {quotes.filter((item) => item.jobId === b.id && item.status !== "cancelled").sort((a, z) => new Date(a.createdAt).getTime() - new Date(z.createdAt).getTime()).map((quote, quoteIndex) => { const lines = (quote.message || "").split("\n"); const items = lines.filter((line) => line.length > 2 && line[0] >= "0" && line[0] <= "9" && line.includes(". ")); const fees = lines.filter((line) => /^(Service fee:|SAVIS fee:|Company fee:|Labour:|Labor:)/i.test(line)); const note = lines.find((line) => line.startsWith("Provider note:")); return <div key={quote.id} className="rounded-2xl border border-[#F5C451]/30 bg-[#F5C451]/[0.06] p-3"><p className="text-xs font-extrabold uppercase tracking-wide text-[#F5C451] mb-2">{quote.status === "accepted" ? "Agreed quote breakdown" : quote.status === "declined" ? `Quote ${quoteIndex + 1} · Declined` : quote.status === "expired" ? `Quote ${quoteIndex + 1} · Expired` : quoteIndex > 0 ? `Replacement quote ${quoteIndex + 1} · Awaiting decision` : "Current quote breakdown"}</p><p className="text-xs text-[#B9C3C9]">Total</p><p className="text-xl font-extrabold text-white mb-3">KSh {quote.amount.toLocaleString()}</p>{items.length > 0 ? <ol className="list-decimal pl-5 space-y-1">{items.map((line, i) => <li key={i}>{line.slice(line.indexOf(". ") + 2)}</li>)}</ol> : <p className="text-xs text-[#B9C3C9]">No item breakdown was saved with this quote.</p>}{fees.map((line, i) => <p key={i} className="mt-2 text-xs text-[#B9C3C9]">{line}</p>)}{note && <p className="mt-3 text-sm text-white">{note.replace("Provider note: ", "")}</p>}<div className="mt-3 border-t border-white/10 pt-3"><p className="text-sm font-bold">{quote.status === "accepted" ? "Accepted" : quote.status === "declined" ? "Declined by you" : quote.status === "expired" ? "Expired" : "Awaiting your decision"}</p><p className="mt-1 text-xs text-[#B9C3C9]">{quote.status === "declined" ? "This quote is saved in your history. Your current request is for a new quote." : quote.status === "accepted" ? "This is the agreed amount for this job." : quote.status === "expired" ? "This quote expired and remains in your history." : "This becomes the agreed amount when you accept it."}</p></div></div>; })}
              <div><p className="text-xs text-[#B9C3C9] mb-1">Location</p><p>{b.location || "Not specified"}</p></div>
              <div><p className="text-xs text-[#B9C3C9] mb-1">When</p><p>{URGENCY_LABEL[b.urgency] || b.urgency || "Not specified"}{b.scheduledFor ? " · " + new Date(b.scheduledFor).toLocaleString() : ""}</p></div>
              <div><p className="text-xs text-[#B9C3C9] mb-1">Provider</p><p>{b.providerName || "Selected provider"} · {b.skill || "Service"}</p></div>
            </div>
            {["requested", "quote_pending"].includes(b.status) && <button type="button" onClick={() => beginEdit(b)} className="mt-5 w-full rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] py-3 text-sm font-bold">Edit job request</button>}
            <button type="button" onClick={() => setDetailJobId(null)} className="mt-2 w-full rounded-full border border-white/15 py-3 text-sm">Close details</button>
          </div>
        </div>;
      })()}

      {editJobId && (() => {
        const b = bookings.find((item) => item.id === editJobId);
        if (!b) return null;
        return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-6" role="dialog" aria-modal="true" aria-label="Edit job request">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto p-5 rounded-[24px] border border-white/15 bg-[#222B31] shadow-2xl">
            <h2 className="font-extrabold text-lg">Edit job request</h2>
            <p className="text-xs text-[#B9C3C9] mt-1 mb-4">This updates the same job. If a quote is already pending, it will be cancelled and the provider must send a new one.</p>
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1">What needs to be done?</label>
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} className="w-full px-3 py-3 rounded-xl bg-black/30 border border-white/15 text-white text-sm mb-3" />
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1">Where is the job?</label>
            <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-black/30 border border-white/15 text-white text-sm mb-3" />
            <label className="block text-xs font-bold text-[#B9C3C9] mb-1">When do you need the work?</label>
            <select value={editUrgency} onChange={(e) => setEditUrgency(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-[#222B31] border border-white/15 text-white text-sm mb-3">
              <option value="now">As soon as possible</option><option value="asap">As soon as possible</option><option value="today">Today</option><option value="week">This week</option><option value="custom">Choose a date &amp; time</option>
            </select>
            {editUrgency === "custom" && <input type="datetime-local" value={editScheduledFor} onChange={(e) => setEditScheduledFor(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-black/30 border border-white/15 text-white text-sm mb-3" />}
            <button type="button" disabled={quoteBusy === editJobId || !editDescription.trim() || !editLocation.trim()} onClick={() => void saveEditedRequest()} className="w-full rounded-full bg-gradient-to-br from-[#E22227] to-[#C7080C] py-3 text-sm font-bold disabled:opacity-50">{quoteBusy === editJobId ? "Saving…" : "Save changes"}</button>
            <button type="button" onClick={() => setEditJobId(null)} className="mt-2 w-full rounded-full border border-white/15 py-3 text-sm">Cancel</button>
          </div>
        </div>;
      })()}

      {ratingJobId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-6">
          <div className="w-full max-w-md p-5 rounded-[24px] border border-white/15 bg-[#222B31] shadow-2xl">
            <h2 className="font-extrabold text-lg mb-1">Rate this job</h2>
            <p className="text-sm text-[#B9C3C9] mb-4">Your feedback helps the SAVIS community.</p>
            <div className="flex gap-2 justify-center mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star${n === 1 ? "" : "s"}`} aria-pressed={n <= stars} onClick={() => setStars(n)} className={`text-3xl transition ${n <= stars ? "text-[#34D399] opacity-100 drop-shadow-[0_0_5px_rgba(52,211,153,0.45)]" : "text-white/25 opacity-100"}`}>★</button>
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
