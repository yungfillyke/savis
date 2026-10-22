"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  listConversations,
  listMessages,
  sendMessage,
  subscribeToConversation,
  type Conversation,
  type Message,
} from "@/lib/messaging";

function shortJob(id?: string) {
  return id ? `Job #${id.slice(-4).toUpperCase()}` : "General conversation";
}

export default function MessagesPage() {
  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [peerProfile, setPeerProfile] = useState<{name:string; avatarUrl:string|null; role:string|null} | null>(null);
  const [jobContext, setJobContext] = useState<{description:string; location:string; scheduledFor:string|null} | null>(null);
  const [homeHref, setHomeHref] = useState("/consumer");

  const loadMessages = useCallback(async (conversationId: string) => {
    setMessages(await listMessages(conversationId));
  }, []);

  const loadConversations = useCallback(async () => {
    const rows = await listConversations();
    setConversations(rows);
    return rows;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login?next=%2Fmessages";
        return;
      }
      if (cancelled) return;
      setUserId(user.id);
      const { data: ownProfile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const ownRole = String(ownProfile?.role || user.user_metadata?.role || "").toLowerCase();
      setHomeHref(ownRole.includes("provider") || ownRole.includes("professional") || ownRole.includes("producer") || ownRole.includes("agent") ? "/provider" : "/consumer");
      const params = new URLSearchParams(window.location.search);
      const jobId = params.get("job");
      let rows = await loadConversations();

      if (jobId) {
        const { data: job } = await supabase
          .from("jobs")
          .select("id, consumer_id, provider_id, description, location, scheduled_for")
          .eq("id", jobId)
          .maybeSingle();
        if (job && (job.consumer_id === user.id || job.provider_id === user.id)) {
          setJobContext({description:String(job.description || ""),location:String(job.location || ""),scheduledFor:job.scheduled_for ? String(job.scheduled_for) : null});
          const otherUserId = job.consumer_id === user.id ? String(job.provider_id) : String(job.consumer_id);
          const { data: otherProfile } = await supabase.from("profiles").select("full_name, avatar_url, role").eq("id", otherUserId).maybeSingle();
          setPeerProfile(otherProfile ? {name:String(otherProfile.full_name || (job.consumer_id === user.id ? "Service provider" : "Customer")),avatarUrl:otherProfile.avatar_url ? String(otherProfile.avatar_url) : null,role:otherProfile.role ? String(otherProfile.role) : null} : {name:job.consumer_id === user.id ? "Service provider" : "Customer",avatarUrl:null,role:null});
          let conversation = rows.find((row) => row.jobId === jobId) || null;
          if (!conversation) {
            const inserted = await supabase.from("conversations").insert({
              consumer_id: job.consumer_id,
              provider_id: String(job.provider_id),
              job_id: jobId,
            }).select("*").single();
            if (inserted.data) {
              conversation = {
                id: String(inserted.data.id),
                consumerId: String(inserted.data.consumer_id),
                providerId: String(inserted.data.provider_id),
                jobId: inserted.data.job_id ? String(inserted.data.job_id) : undefined,
                lastMessageAt: String(inserted.data.last_message_at || inserted.data.created_at || new Date().toISOString()),
              };
              rows = [conversation, ...rows];
            } else {
              setNotice("Could not open this job conversation yet. Please refresh and try again.");
            }
          }
          if (conversation) {
            setSelected(conversation);
            await loadMessages(conversation.id);
          }
        } else {
          setNotice("This job conversation is not available to this account.");
        }
      } else if (rows.length) {
        setSelected(rows[0]);
        await loadMessages(rows[0].id);
      }
      if (!cancelled) {
        setConversations(rows);
        setLoading(false);
      }
    }
    void boot();
    return () => { cancelled = true; };
  }, [loadConversations, loadMessages]);

  useEffect(() => {
    if (!selected?.id) return;
    return subscribeToConversation(selected.id, (message) => {
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    });
  }, [selected?.id]);

  async function openConversation(conversation: Conversation) {
    setSelected(conversation);
    setNotice("");
    await loadMessages(conversation.id);
  }

  async function submitMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    setNotice("");
    try {
      const saved = await sendMessage(selected.id, draft);
      if (!saved) throw new Error("Message could not be saved. Check your connection and try again.");
      setMessages((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]);
      setDraft("");
      await loadConversations();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="savis-internal min-h-screen pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[rgba(34,43,49,0.86)] px-4 py-3 backdrop-blur-md">
        <Link href={homeHref} className="text-sm font-bold text-[#B9C3C9]">← Home</Link>
        <h1 className="font-extrabold">Messages</h1>
        <span className="w-12" />
      </header>
      <div className="mx-auto grid max-w-4xl gap-4 px-4 pt-6 md:grid-cols-[250px_1fr]">
        <aside className="rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-3">
          <h2 className="px-2 py-2 font-extrabold">Conversations</h2>
          {loading ? <p className="p-3 text-sm text-[#B9C3C9]">Loading conversations…</p> :
            conversations.length === 0 ? <p className="p-3 text-sm text-[#B9C3C9]">No conversations yet. Open Message from a job to start one.</p> :
            <div className="space-y-1">{conversations.map((conversation) => (
              <button key={conversation.id} type="button" onClick={() => void openConversation(conversation)} className={`w-full rounded-xl p-3 text-left ${selected?.id === conversation.id ? "bg-white/10 border border-white/15" : "hover:bg-white/5"}`}>
                <b className="block text-sm">{shortJob(conversation.jobId)}</b>
                <span className="mt-1 block text-xs text-[#B9C3C9]">{new Date(conversation.lastMessageAt).toLocaleString()}</span>
              </button>
            ))}</div>}
        </aside>
        <section className="flex min-h-[65vh] flex-col rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4">
          <div className="border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              {peerProfile?.avatarUrl ? <img src={peerProfile.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover border border-white/15" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-black">{(peerProfile?.name || "S").charAt(0).toUpperCase()}</div>}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-extrabold">{peerProfile?.name || (selected ? "Job conversation" : "Your conversation")}</h2>
                <p className="mt-0.5 text-xs text-[#F5C451]">{selected ? shortJob(selected.jobId) : "No job selected"}{peerProfile?.role ? " · " + peerProfile.role : ""}</p>
                {jobContext && <p className="mt-1 text-xs text-[#B9C3C9]">{jobContext.location}{jobContext.scheduledFor ? " · " + new Date(jobContext.scheduledFor).toLocaleString() : ""}</p>}
              </div>
              {selected && <Link href={homeHref === "/provider" ? "/provider" : "/bookings"} className="shrink-0 rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-[#F5C451]">Job</Link>}
            </div>
            {jobContext?.description && <details className="mt-3 rounded-xl bg-white/5 px-3 py-2"><summary className="cursor-pointer text-xs font-bold text-[#B9C3C9]">View work description</summary><p className="whitespace-pre-wrap break-words pt-2 text-sm text-white">{jobContext.description}</p></details>}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto py-4">
            {!selected ? <p className="py-8 text-center text-sm text-[#B9C3C9]">Open a conversation from a job to get started.</p> :
              messages.length === 0 ? <p className="py-8 text-center text-sm text-[#B9C3C9]">No messages yet. Send the first message below.</p> :
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.senderId === userId ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${message.senderId === userId ? "bg-[#C7080C] text-white" : "bg-white/10 text-white"}`}>
                    <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                    <p className="mt-1 text-right text-[0.62rem] opacity-70">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
          </div>
          {notice && <p role="status" className="mb-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">{notice}</p>}
          <form onSubmit={submitMessage} className="flex gap-2 border-t border-white/10 pt-3">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!selected || sending} placeholder={selected ? "Write a message…" : "Select a conversation"} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-[#E22227] disabled:opacity-50" />
            <button type="submit" disabled={!selected || !draft.trim() || sending} className="rounded-xl bg-gradient-to-r from-[#E22227] to-[#C7080C] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{sending ? "Sending…" : "Send"}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
