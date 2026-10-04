import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createHmac } from "node:crypto";
function sign(payload: string) { const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEVELOPER_ASSIST_SECRET; if (!secret) throw new Error("Developer session signing secret is not configured"); return createHmac("sha256", secret).update(payload).digest("base64url"); }
export async function POST(request: Request) {
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const {sessionId}=await request.json().catch(()=>({})); if(!sessionId)return NextResponse.json({error:"sessionId required"},{status:400});
 const {data:isDeveloper,error:accessError}=await supabase.rpc("is_developer_admin"); if(accessError||!isDeveloper)return NextResponse.json({error:"Developer access required"},{status:403});
 const {data:session,error}=await supabase.rpc("activate_developer_assisted_session",{p_session_id:sessionId}); if(error||!session)return NextResponse.json({error:error?.message||"Unable to activate session"},{status:400});
 const payload=Buffer.from(JSON.stringify({sid:session.id,developerId:session.developer_id,targetUserId:session.target_user_id,targetRole:session.target_role,exp:new Date(session.expires_at).getTime()})).toString("base64url");
 const response=NextResponse.json({ok:true,expiresAt:session.expires_at,targetUserId:session.target_user_id,targetRole:session.target_role}); response.cookies.set("savis_developer_assisted",payload+"."+sign(payload),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:new Date(session.expires_at)}); return response;
}
export async function DELETE() {
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:"Authentication required"},{status:401}); const {data:isDeveloper}=await supabase.rpc("is_developer_admin"); if(!isDeveloper)return NextResponse.json({error:"Developer access required"},{status:403});
 const jar=await cookies(); const c=jar.get("savis_developer_assisted"); if(c){try{const payload=JSON.parse(Buffer.from(c.value.split(".")[0],"base64url").toString("utf8")); await supabase.rpc("end_developer_assisted_session",{p_session_id:payload.sid});}catch{}}
 const response=NextResponse.json({ok:true}); response.cookies.delete("savis_developer_assisted"); return response;
}