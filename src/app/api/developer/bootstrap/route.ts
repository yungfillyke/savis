import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const configuredEmail = (process.env.SAVIS_DEVELOPER_EMAIL || "").trim().toLowerCase();
  if (!configuredEmail || user.email.toLowerCase() !== configuredEmail) {
    return NextResponse.json({ error: "Developer bootstrap is not enabled for this account." }, { status: 403 });
  }
  const { count, error: countError } = await supabase.from("developer_admins").select("user_id", { count: "exact", head: true });
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((count || 0) > 0) return NextResponse.json({ error: "Developer bootstrap is already closed." }, { status: 409 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Server developer bootstrap is not configured." }, { status: 503 });
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await admin.from("developer_admins").insert({ user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("developer_audit_log").insert({ actor_id: user.id, action: "developer.bootstrap", metadata: { method: "configured_email" } });
  return NextResponse.json({ ok: true });
}
