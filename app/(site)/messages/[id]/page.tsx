import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Chat from "@/components/Chat";
import Avatar from "@/components/Avatar";
import type { InboxRow, Message } from "@/lib/types";

export const runtime = "edge";

export default async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: info } = await supabase.rpc("get_inbox", { p_conversation_id: id });   // empty unless you're in it
  const row = (info as InboxRow[] | null)?.[0];
  if (!row || !user) notFound();
  const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }).limit(500);

  return (
    <div className="chat-page">
      <div className="chat-head">
        <Link href="/messages" className="chat-back" aria-label="Back to Inbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
        </Link>
        <Avatar url={row.other_avatar_url} name={row.other_name} />
        <div className="chat-who">
          <h1>{row.other_name}</h1>
          <Link href={`/jobs/${row.job_id}`}>{row.job_title} · View job</Link>
        </div>
      </div>
      <Chat conversationId={id} userId={user.id} initial={(msgs ?? []) as Message[]} />
    </div>
  );
}
