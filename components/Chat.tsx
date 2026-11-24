"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";

export default function Chat({ conversationId, userId, initial }: { conversationId: string; userId: string; initial: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const markRead = useCallback(async () => {
    await createClient().rpc("mark_conversation_read", { p_conversation_id: conversationId });
    window.dispatchEvent(new Event("jk:unread"));
  }, [conversationId]);

  const add = useCallback((m: Message) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    markRead();
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          add(m);
          if (m.sender_id !== userId) markRead();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, userId, add, markRead]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true); setError("");
    const { data, error } = await createClient().from("messages")
      .insert({ conversation_id: conversationId, sender_id: userId, body: text }).select().single();
    setSending(false);
    if (error) return setError(error.message);
    setBody("");
    add(data as Message);
  }

  return (
    <div className="chat">
      <div className="chat-log">
        {messages.length === 0 && <p className="mute" style={{ textAlign: "center" }}>Say hello 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.sender_id === userId ? "mine" : "theirs"}`}>
            <div>{m.body}</div>
            <time>{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <div className="err">{error}</div>}
      <form className="chat-input" onSubmit={send}>
        <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000}
          placeholder="Write a message…" aria-label="Message" autoComplete="off" />
        <button disabled={sending || !body.trim()}>Send</button>
      </form>
    </div>
  );
}
