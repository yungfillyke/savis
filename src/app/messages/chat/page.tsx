"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  listConversations,
  listMessages,
  sendMessage,
  uploadMessageAttachment,
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
  const [recording, setRecording] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const loadMessages = useCallback(async (conversationId: string) => {
    setMessages(await listMessages(conversationId));
  }, []);

  const markConversationRead = useCallback(async (conversationId: string, currentUserId: string) => {
    const supabase = createClient();
    await supabase.from("messages").update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId).neq("sender_id", currentUserId).is("read_at", null);
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
      const conversationId = params.get("conversation");
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
          await markConversationRead(conversation.id, user.id);
            await markConversationRead(conversation.id, user.id);
          }
        } else {
          setNotice("This job conversation is not available to this account.");
        }
      } else if (conversationId) {
        const conversation = rows.find((row) => row.id === conversationId);
        if (conversation) {
          setSelected(conversation);
          await loadMessages(conversation.id);
          if (conversation.jobId) {
            const { data: job } = await supabase.from("jobs").select("id,consumer_id,provider_id,description,location,scheduled_for").eq("id", conversation.jobId).maybeSingle();
            if (job && (job.consumer_id === user.id || job.provider_id === user.id)) {
              setJobContext({description:String(job.description || ""),location:String(job.location || ""),scheduledFor:job.scheduled_for ? String(job.scheduled_for) : null});
              const otherId = job.consumer_id === user.id ? String(job.provider_id) : String(job.consumer_id);
              const { data: peer } = await supabase.from("profiles").select("full_name,avatar_url,role").eq("id", otherId).maybeSingle();
              setPeerProfile({name:String(peer?.full_name || (job.consumer_id === user.id ? "Service provider" : "Customer")),avatarUrl:peer?.avatar_url ? String(peer.avatar_url) : null,role:peer?.role ? String(peer.role) : null});
            }
          }
        }
      }
      if (!cancelled) {
        setConversations(rows);
        setLoading(false);
      }
    }
    void boot();
    return () => { cancelled = true; };
  }, [loadConversations, loadMessages, markConversationRead]);

  useEffect(() => {
    if (!selected?.id) return;
    return subscribeToConversation(selected.id, () => { void loadMessages(selected.id); });
  }, [selected?.id, loadMessages]);

  async function openConversation(conversation: Conversation) {
    setSelected(conversation);
    setNotice("");
    setPeerProfile(null);
    setJobContext(null);
    await loadMessages(conversation.id);
    await markConversationRead(conversation.id, userId);

    // Load context for this exact conversation so another job's details never remain visible.
    if (!conversation.jobId) return;
    const supabase = createClient();
    const { data: job } = await supabase
      .from("jobs")
      .select("id, consumer_id, provider_id, description, location, scheduled_for")
      .eq("id", conversation.jobId)
      .maybeSingle();
    if (!job || (job.consumer_id !== userId && job.provider_id !== userId)) {
      setNotice("This job conversation is not available to this account.");
      return;
    }
    setJobContext({
      description: String(job.description || ""),
      location: String(job.location || ""),
      scheduledFor: job.scheduled_for ? String(job.scheduled_for) : null,
    });
    const otherUserId = job.consumer_id === userId ? String(job.provider_id) : String(job.consumer_id);
    const fallbackName = job.consumer_id === userId ? "Service provider" : "Customer";
    const { data: otherProfile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .eq("id", otherUserId)
      .maybeSingle();
    setPeerProfile(otherProfile
      ? {
          name: String(otherProfile.full_name || fallbackName),
          avatarUrl: otherProfile.avatar_url ? String(otherProfile.avatar_url) : null,
          role: otherProfile.role ? String(otherProfile.role) : null,
        }
      : { name: fallbackName, avatarUrl: null, role: null });
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

  async function uploadPickedFile(file?: File) {
    if (!file || !selected || mediaBusy) return;
    if (!file.type.startsWith("image/")) { setNotice("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setNotice("Choose a photo under 8 MB."); return; }
    setMediaBusy(true); setNotice("");
    try {
      const saved = await uploadMessageAttachment(selected.id, file, "image");
      if (!saved) throw new Error("Photo could not be attached to this conversation.");
      await loadMessages(selected.id); await loadConversations();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Photo upload failed. Please try again."); }
    finally { setMediaBusy(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  async function toggleVoiceRecording() {
    if (recording) { recorderRef.current?.stop(); setRecording(false); return; }
    if (!selected || mediaBusy) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) { setNotice("Voice recording is not supported by this browser. Try a current browser over HTTPS."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { stream.getTracks().forEach((track) => track.stop()); setRecording(false); setMediaBusy(false); setNotice("Voice recording failed. Please try again."); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop()); setRecording(false);
        const mime = recorder.mimeType || "audio/webm";
        const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunks, { type: mime });
        if (!blob.size) return;
        if (blob.size > 12 * 1024 * 1024) { setNotice("Voice note is over 12 MB. Please record a shorter note."); return; }
        setMediaBusy(true); setNotice("");
        try {
          const file = new File([blob], "voice-note-" + Date.now() + "." + ext, { type: mime });
          const saved = await uploadMessageAttachment(selected.id, file, "audio");
          if (!saved) throw new Error("Voice note could not be saved.");
          await loadMessages(selected.id); await loadConversations();
        } catch (error) { setNotice(error instanceof Error ? error.message : "Voice note upload failed."); }
        finally { setMediaBusy(false); }
      };
      recorderRef.current = recorder; recorder.start(); setRecording(true); setNotice("Recording… tap Stop when you are finished.");
    } catch { setNotice("Microphone access was not granted. Allow microphone access in your browser and try again."); }
  }

  return (
    <main className="savis-internal savis-chat-shell min-h-screen pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[rgba(34,43,49,0.86)] px-4 py-3 backdrop-blur-md">
        <Link href={homeHref} className="text-sm font-bold text-[#B9C3C9]">← Home</Link>
        <h1 className="font-extrabold">Messages</h1>
        <span className="w-12" />
      </header>
      <div className="mx-auto grid max-w-2xl gap-4 px-4 pt-6 grid-cols-1">
        <section className="savis-chat-panel flex min-h-[75vh] flex-col rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-4">
          <div className="savis-chat-head border-b border-white/10 pb-3">
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
          <div className="savis-chat-messages flex-1 space-y-3 overflow-y-auto py-4">
            {!selected ? <p className="py-8 text-center text-sm text-[#B9C3C9]">Open a conversation from a job to get started.</p> :
              messages.length === 0 ? <p className="py-8 text-center text-sm text-[#B9C3C9]">No messages yet. Send the first message below.</p> :
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.senderId === userId ? "justify-end" : "justify-start"}`}>
                  <div className={`savis-chat-bubble ${message.senderId === userId ? "is-mine" : "is-theirs"}`}>
                    {message.attachmentType === "image" && message.attachmentUrl && <a href={message.attachmentUrl} target="_blank" rel="noreferrer" aria-label="Open attached photo"><img src={message.attachmentUrl} alt="Photo attachment" className="mb-2 max-h-72 w-full rounded-xl object-contain" loading="lazy" /></a>}
                    {message.attachmentType === "audio" && message.attachmentUrl && <div className="mb-2 min-w-[220px]"><p className="mb-1 text-xs font-bold">🎙 Voice note</p><audio controls preload="none" src={message.attachmentUrl} className="w-full" /></div>}
                    {message.body && <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>}
                    <p className="mt-1 text-right text-[0.62rem] opacity-70">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
          </div>
          {notice && <p role="status" className="savis-chat-notice mb-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">{notice}</p>}
          <div className="savis-chat-composer border-t border-white/10 pt-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" className="hidden" onChange={(e) => void uploadPickedFile(e.target.files?.[0])} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!selected || sending || mediaBusy || recording} className="savis-chat-action rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">＋</button>
              <button type="button" onClick={() => void toggleVoiceRecording()} disabled={!selected || sending || mediaBusy} className={`savis-chat-action rounded-full border px-3 py-2 text-xs font-bold disabled:opacity-50 ${recording ? "border-red-400 bg-red-500/15 text-red-100" : "border-white/15 text-white"}`}>{recording ? "■ Stop" : "🎙"}</button>
              {mediaBusy && <span className="text-xs text-white/60">Uploading…</span>}
            </div>
            <form onSubmit={submitMessage} className="flex items-center gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!selected || sending || mediaBusy || recording} placeholder={selected ? "Write a message…" : "Select a conversation"} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-[#E22227] disabled:opacity-50" />
              <button type="submit" disabled={!selected || !draft.trim() || sending || mediaBusy || recording} className="savis-chat-send rounded-full bg-gradient-to-r from-[#E22227] to-[#C7080C] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{sending ? "Sending…" : "Send"}</button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
