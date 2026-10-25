"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { listConversations, listMessages, type Conversation } from "@/lib/messaging";

type InboxRow = {
  conversation: Conversation;
  jobIdLabel: string;
  jobDescription: string;
  personName: string;
  avatarUrl: string | null;
  preview: string;
  unread: number;
  lastMessageAt: string;
};

function shortJob(id?: string) { return id ? `Job #${id.slice(-4).toUpperCase()}` : "General conversation"; }

export default function MessagesInboxPage() {
  const router = useRouter();
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeHref, setHomeHref] = useState("/consumer");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login?next=%2Fmessages"); return; }
      const { data: own } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const role = String(own?.role || user.user_metadata?.role || "").toLowerCase();
      const provider = ["provider","professional","producer","agent","wholesale_retail"].includes(role);
      setHomeHref(provider ? "/provider" : "/consumer");
      const conversations = await listConversations();
      const result: InboxRow[] = [];
      for (const conversation of conversations) {
        if (cancelled) return;
        let jobIdLabel = shortJob(conversation.jobId);
        let jobDescription = "";
        let personName = provider ? "Customer" : "Service provider";
        let avatarUrl: string | null = null;
        let preview = "Open conversation";
        let unread = 0;
        let lastMessageAt = conversation.lastMessageAt;
        if (conversation.jobId) {
          const { data: job } = await supabase.from("jobs")
            .select("id,consumer_id,provider_id,description")
            .eq("id", conversation.jobId).maybeSingle();
          if (job && (job.consumer_id === user.id || job.provider_id === user.id)) {
            jobDescription = String(job.description || "");
            const otherId = job.consumer_id === user.id ? String(job.provider_id) : String(job.consumer_id);
            const { data: person } = await supabase.from("profiles")
              .select("full_name,avatar_url").eq("id", otherId).maybeSingle();
            personName = String(person?.full_name || personName);
            avatarUrl = person?.avatar_url ? String(person.avatar_url) : null;
          } else {
            continue;
          }
        }
        const messages = await listMessages(conversation.id);
        if (messages.length) {
          const latest = messages[messages.length - 1];
          preview = latest.attachmentType === "audio" ? "🎙 Voice note" : latest.attachmentUrl ? (latest.body ? `📷 ${latest.body}` : "Photo attachment") : latest.body;
          lastMessageAt = latest.createdAt;
          unread = messages.filter((m) => m.senderId !== user.id && !m.readAt).length;
        }
        result.push({ conversation, jobIdLabel, jobDescription, personName, avatarUrl, preview, unread, lastMessageAt });
      }
      result.sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      if (!cancelled) { setRows(result); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main className="savis-internal min-h-screen pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[rgba(34,43,49,0.92)] px-4 py-3 backdrop-blur-md">
        <Link href={homeHref} className="text-sm font-bold text-[#B9C3C9]">← Home</Link>
        <h1 className="font-extrabold">Messages</h1>
        <span className="w-12" />
      </header>
      <div className="mx-auto max-w-2xl px-4 pt-5">
        <h2 className="text-xl font-extrabold">Conversations</h2>
        <p className="mt-1 mb-4 text-sm text-[#B9C3C9]">Each job has its own private conversation.</p>
        {loading ? <p className="py-8 text-center text-sm text-[#B9C3C9]">Loading conversations…</p> :
          rows.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center"><p className="font-bold">No conversations yet</p><p className="mt-2 text-sm text-[#B9C3C9]">Open a job and choose Message to start a conversation.</p></div> :
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(34,43,49,0.72)]">
            {rows.map((row) => <Link key={row.conversation.id} href={row.conversation.jobId ? `/messages/chat?job=${encodeURIComponent(row.conversation.jobId)}` : `/messages/chat?conversation=${encodeURIComponent(row.conversation.id)}`} className="flex items-center gap-3 border-b border-white/10 p-4 last:border-b-0 hover:bg-white/5">
              {row.avatarUrl ? <img src={row.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 font-black">{row.personName.charAt(0).toUpperCase()}</div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-xs font-bold text-[#F5C451]">{row.jobIdLabel}</span><span className="text-sm font-extrabold">{homeHref === "/provider" ? "Customer" : "Provider"} · {row.personName}</span></div>
                <p className="mt-1 truncate text-sm text-white/80">{row.preview}</p>
                {row.jobDescription && <p className="mt-0.5 truncate text-xs text-[#B9C3C9]">{row.jobDescription}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2"><span className="text-[0.65rem] text-[#B9C3C9]">{new Date(row.lastMessageAt).toLocaleDateString()}</span>{row.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C7080C] px-1 text-[0.65rem] font-black text-white">{row.unread}</span>}<span className="text-[#B9C3C9]">›</span></div>
            </Link>)}
          </div>}
      </div>
    </main>
  );
}
