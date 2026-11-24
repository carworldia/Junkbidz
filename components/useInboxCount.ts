"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { quoteWaitingOn, type QuoteRow } from "@/lib/types";

// One shared counter for every Inbox badge (header, phone menu button, bottom bar):
// unread messages + quotes where it's my turn to reply.
// A single module-level store so the header and bottom bar don't each open their own connection.

type Listener = (n: number) => void;
const listeners = new Set<Listener>();
// "Something changed" listeners: fired on any live database event, or when the count goes up.
type ActivityListener = (e: { grew: boolean }) => void;
const activity = new Set<ActivityListener>();
let total = 0;
let primed = false;   // first count after load shouldn't pop a "new" notice
let started = false;
let stop: (() => void) | null = null;
let inflight = false;

async function recount() {
  if (inflight) return;
  inflight = true;
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const me = session?.user.id;
    if (!me) { publish(0); return; }
    const [{ data: unread }, { data: quotes }] = await Promise.all([
      supabase.rpc("unread_count"),
      supabase.rpc("list_quotes"),
    ]);
    const msgs = typeof unread === "number" ? unread : 0;
    const q = ((quotes ?? []) as QuoteRow[]).filter((x) => quoteWaitingOn(x, me)).length;
    publish(msgs + q);
  } catch {
    // Network hiccup: keep the last known count.
  } finally {
    inflight = false;
  }
}

function publish(n: number) {
  const grew = primed && n > total;
  total = n;
  primed = true;
  listeners.forEach((l) => l(n));
  if (grew) activity.forEach((a) => a({ grew: true }));
}

// A live database event: refresh pages right away, then recount the badge.
function onLiveEvent() {
  activity.forEach((a) => a({ grew: false }));
  recount();
}

function start() {
  if (started) return;
  started = true;
  const supabase = createClient();
  const channel = supabase
    .channel("inbox-count")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, onLiveEvent)
    .on("postgres_changes", { event: "*", schema: "public", table: "job_quotes" }, onLiveEvent)
    .subscribe();
  // Signing in/out changes whose inbox this is: start fresh so it doesn't pop a false "new" notice.
  const { data: auth } = supabase.auth.onAuthStateChange(() => { primed = false; recount(); });
  // Backup in case live updates are off: re-check every 15s while the page is on screen,
  // and right away when the person comes back to the tab.
  const timer = window.setInterval(() => { if (document.visibilityState === "visible") recount(); }, 15_000);
  const onFocus = () => { if (document.visibilityState === "visible") recount(); };
  document.addEventListener("visibilitychange", onFocus);
  window.addEventListener("jk:unread", recount);
  recount();
  stop = () => {
    supabase.removeChannel(channel);
    auth.subscription.unsubscribe();
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onFocus);
    window.removeEventListener("jk:unread", recount);
    started = false;
  };
}

export function refreshInboxCount() { recount(); }

export function onInboxActivity(fn: ActivityListener) {
  activity.add(fn);
  return () => { activity.delete(fn); };
}

export function useInboxCount(pathname?: string) {
  const [n, setN] = useState(total);
  useEffect(() => {
    listeners.add(setN);
    start();
    setN(total);
    return () => {
      listeners.delete(setN);
      if (listeners.size === 0 && stop) { stop(); stop = null; }
    };
  }, []);
  // Re-check after every page change (e.g. after reading a conversation or answering a quote).
  useEffect(() => { if (started) recount(); }, [pathname]);
  return n;
}
