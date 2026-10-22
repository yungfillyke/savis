import { createClient } from "@/lib/supabase/client";

export type Quote = {
  id: string;
  jobId: string;
  providerId: string;
  amount: number;
  message: string;
  status: "pending" | "accepted" | "declined" | "expired" | "cancelled";
  expiresAt?: string;
  createdAt: string;
};

function rowToQuote(row: Record<string, unknown>): Quote {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    providerId: String(row.provider_id),
    amount: Number(row.amount) || 0,
    message: String(row.message || ""),
    status: (row.status as Quote["status"]) || "pending",
    expiresAt: row.expires_at ? String(row.expires_at) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function listQuotesForJobs(jobIds: string[]) {
  if (!jobIds.length) return [] as Quote[];
  const supabase = createClient();
  const { data, error } = await supabase.from("quotes").select("*").in("job_id", jobIds).order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToQuote);
}

export async function createQuote(jobId: string, amount: number, message: string, expiresAt?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || amount < 0) return null;
  // A provider should have one current pending quote per job. Update it instead
  // of inserting a duplicate when the provider revises the price.
  const existing = await supabase.from("quotes").select("id")
    .eq("job_id", jobId).eq("provider_id", user.id).eq("status", "pending")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  let data: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;
  if (existing.data?.id) {
    const updated = await supabase.from("quotes").update({
      amount: Math.round(amount),
      message: message.trim() || null,
      expires_at: expiresAt || null,
    }).eq("id", existing.data.id).select("*").single();
    data = updated.data as Record<string, unknown> | null;
    error = updated.error;
  } else {
    const created = await supabase.from("quotes").insert({
      job_id: jobId,
      provider_id: user.id,
      amount: Math.round(amount),
      message: message.trim() || null,
      expires_at: expiresAt || null,
      status: "pending",
    }).select("*").single();
    data = created.data as Record<string, unknown> | null;
    error = created.error;
  }
  if (error) throw new Error(error.message || "Database rejected the quote.");
  if (!data) throw new Error("SAVIS did not return the saved quote.");
  return rowToQuote(data);
}

export async function declineQuote(quoteId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("decline_quote", { p_quote_id: quoteId });
  if (error || !data) return { ok: false, error: error?.message || "Could not decline this quote." };
  return { ok: true, jobId: String(data) };
}

export async function acceptQuote(quoteId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("accept_quote", { p_quote_id: quoteId });
  if (error || !data) return { ok: false, error: error?.message || "Could not accept quote." };
  return { ok: true, jobId: String(data) };
}
