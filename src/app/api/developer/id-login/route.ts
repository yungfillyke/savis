import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function matches(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const expectedId = process.env.SAVIS_DEVELOPER_ID || "";
  const expectedPassword = process.env.SAVIS_DEVELOPER_PASSWORD || "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

  if (!expectedId || !expectedPassword || !url || !publicKey || !adminKey) {
    return NextResponse.json({ error: "Developer sign-in is not fully configured on the server yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const suppliedId = String(body.id || "").trim();
  const suppliedPassword = String(body.password || "");
  if (!matches(suppliedId, expectedId) || !matches(suppliedPassword, expectedPassword)) {
    return NextResponse.json({ error: "Invalid developer ID or password." }, { status: 401 });
  }

  // The external developer ID is mapped to a valid internal Supabase Auth identity.
  // This identity is only used by the server to establish a normal, permission-checked Supabase session.
  const internalEmail = "savis-developer-" + expectedId.toLowerCase().replace(/[^a-z0-9]/g, "") + "@savis-alpha.vercel.app";
  const admin = createSupabaseClient(url, adminKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = createSupabaseClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let userId: string | null = null;
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ error: "Could not verify the developer account." }, { status: 503 });
  const existing = listed.users.find((user) => user.email?.toLowerCase() === internalEmail);
  if (existing) {
    userId = existing.id;
    const { error } = await admin.auth.admin.updateUserById(userId, { password: expectedPassword, email_confirm: true });
    if (error) return NextResponse.json({ error: "Could not recover the internal developer account." }, { status: 503 });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: expectedPassword,
      email_confirm: true,
      app_metadata: { savis_developer_account: true }
    });
    if (error || !data.user) return NextResponse.json({ error: "Could not create the internal developer account." }, { status: 503 });
    userId = data.user.id;
  }

  const { error: allowlistError } = await admin.from("developer_admins").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (allowlistError) return NextResponse.json({ error: "Developer account exists, but permissions could not be restored." }, { status: 503 });

  const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email: internalEmail, password: expectedPassword });
  if (signInError || !signedIn.session) return NextResponse.json({ error: "Developer account was prepared, but a session could not be started." }, { status: 503 });

  await admin.from("developer_audit_log").insert({
    actor_id: userId,
    action: "developer.login",
    metadata: { method: "dedicated_developer_id" }
  });

  return NextResponse.json({
    ok: true,
    session: {
      access_token: signedIn.session.access_token,
      refresh_token: signedIn.session.refresh_token
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
