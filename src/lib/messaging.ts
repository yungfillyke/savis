import { createClient } from "@/lib/supabase/client";

export type Conversation = {
  id: string;
  consumerId: string;
  providerId: string;
  jobId?: string;
  lastMessageAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachmentUrl?: string;
  createdAt: string;
  readAt?: string;
};

function rowConversation(row: Record<string, unknown>): Conversation {
  return { id:String(row.id), consumerId:String(row.consumer_id), providerId:String(row.provider_id), jobId:row.job_id?String(row.job_id):undefined, lastMessageAt:String(row.last_message_at||row.created_at||new Date().toISOString()) };
}
function rowMessage(row: Record<string, unknown>): Message {
  return { id:String(row.id), conversationId:String(row.conversation_id), senderId:String(row.sender_id), body:String(row.body||""), attachmentUrl:row.attachment_url?String(row.attachment_url):undefined, createdAt:String(row.created_at||new Date().toISOString()), readAt:row.read_at?String(row.read_at):undefined };
}
export async function listConversations():Promise<Conversation[]> {
  const {data,error}=await createClient().from("conversations").select("*").order("last_message_at",{ascending:false});
  return error?[]:(data||[]).map(rowConversation);
}
export async function listMessages(conversationId:string):Promise<Message[]> {
  const {data,error}=await createClient().from("messages").select("*").eq("conversation_id",conversationId).order("created_at",{ascending:true});
  return error?[]:(data||[]).map(rowMessage);
}
export async function getOrCreateConversation(providerId:string,jobId?:string):Promise<Conversation|null>{
  const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
  let q=supabase.from("conversations").select("*").eq("consumer_id",user.id).eq("provider_id",providerId);
  q=jobId?q.eq("job_id",jobId):q.is("job_id",null);
  const existing=await q.maybeSingle(); if(existing.data)return rowConversation(existing.data);
  const created=await supabase.from("conversations").insert({consumer_id:user.id,provider_id:providerId,job_id:jobId||null}).select("*").single();
  return created.data?rowConversation(created.data):null;
}
export async function sendMessage(conversationId:string,body:string):Promise<Message|null>{
  const text=body.trim(); if(!text)return null;
  const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
  const created=await supabase.from("messages").insert({conversation_id:conversationId,sender_id:user.id,body:text}).select("*").single();
  if(created.error||!created.data)return null;
  await supabase.from("conversations").update({last_message_at:new Date().toISOString()}).eq("id",conversationId);
  return rowMessage(created.data);
}
export function subscribeToConversation(conversationId:string,onMessage:(message:Message)=>void){
  const supabase=createClient();
  const channel=supabase.channel(`savis-conversation-${conversationId}`)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`conversation_id=eq.${conversationId}`},payload=>onMessage(rowMessage(payload.new as Record<string,unknown>)))
    .subscribe();
  return ()=>{void supabase.removeChannel(channel);};
}
export function subscribeToConversations(onConversation:(conversation:Conversation)=>void){
  const supabase=createClient();
  const channel=supabase.channel("savis-conversations")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"conversations"},payload=>onConversation(rowConversation(payload.new as Record<string,unknown>)))
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"conversations"},payload=>onConversation(rowConversation(payload.new as Record<string,unknown>)))
    .subscribe();
  return ()=>{void supabase.removeChannel(channel);};
}
