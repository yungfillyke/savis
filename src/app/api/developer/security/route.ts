import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: allowed } = await supabase.rpc("is_developer_admin");
  if (!allowed) return NextResponse.json({ error: "Developer access required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "");
  const action = String(body.action || "");
  const confirmation = String(body.confirmation || "");
  const configured = String(process.env.SAVIS_NUCLEAR_CODE || "");
  if (!/^\d{12}$/.test(configured) || code !== configured) return NextResponse.json({ error: "Invalid developer credential." }, { status: 403 });
  if (!["maintenance_on","maintenance_off","signup_on","signup_off","payments_on","payments_off"].includes(action)) return NextResponse.json({ error: "Unsupported control." }, { status: 400 });
  if (confirmation !== action.toUpperCase()) return NextResponse.json({ error: "Typed confirmation does not match." }, { status: 400 });

  const { data: state, error } = await supabase.rpc("developer_security_snapshot");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: updated, error: updateError } = await supabase.rpc("developer_set_system_state", {
    p_maintenance: action === "maintenance_on" ? true : action === "maintenance_off" ? false : Boolean(state.maintenance_mode),
    p_read_only: Boolean(state.read_only_mode),
    p_signup_enabled: action === "signup_off" ? false : action === "signup_on" ? true : Boolean(state.signup_enabled),
    p_payments_enabled: action === "payments_off" ? false : action === "payments_on" ? true : Boolean(state.payments_enabled)
  });
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true, state: updated });
}
