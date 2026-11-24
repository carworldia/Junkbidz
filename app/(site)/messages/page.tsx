import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import { ChatIcon } from "@/components/Icons";
import { lastPrice, money, quoteWaitingOn, type InboxRow, type QuoteRow } from "@/lib/types";

export const runtime = "edge";
export const metadata: Metadata = { title: "Inbox" };

export default async function Inbox({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const showQuotes = tab === "quotes";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const me = user?.id ?? "";
  const [{ data, error }, { data: q, error: qError }] = await Promise.all([supabase.rpc("get_inbox"), supabase.rpc("list_quotes")]);
  const rows = (data ?? []) as InboxRow[];
  const quotes = (q ?? []) as QuoteRow[];
  const unread = rows.reduce((t, r) => t + r.unread_count, 0);
  const waiting = quotes.filter((x) => quoteWaitingOn(x, me));
  const received = quotes.filter((x) => x.customer_id === me);
  const sent = quotes.filter((x) => x.hauler_id === me);
  const sortQ = (list: QuoteRow[]) => [...list].sort((a, b) => Number(quoteWaitingOn(b, me)) - Number(quoteWaitingOn(a, me)) || +new Date(b.updated_at) - +new Date(a.updated_at));
  const count = (n: number) => n > 0 && <span className="badge-count">{n > 99 ? "99+" : n}</span>;

  const quoteRow = (x: QuoteRow, asCustomer: boolean) => {
    const turn = quoteWaitingOn(x, me);
    return (
      <Link key={x.id} href={`/jobs/${x.job_id}`} className={`card inbox-row${turn ? " unread" : ""}`}>
        <Avatar url={asCustomer ? x.hauler_avatar_url : null} name={asCustomer ? x.business_name : x.job_title} />
        <div className="meta">
          <div className="top"><strong>{asCustomer ? x.business_name ?? "A company" : "Your quote"}</strong><span className="mute">{new Date(x.updated_at).toLocaleDateString()}</span></div>
          <div className="mute">{x.job_title}</div>
          <div className="preview"><strong>{money(lastPrice(x))}</strong>{" "}
            {turn ? <span className="your-turn">{asCustomer ? "Review & reply" : "They countered. Your turn"}</span>
              : <span className={`badge ${x.status}`}>{x.status === "accepted" ? "Hired" : x.status === "submitted" ? "Sent" : x.status}</span>}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <>
      <h1 className="app-h1">Inbox</h1>
      <nav className="dealer-toggle inbox-toggle" aria-label="Inbox sections">
        <Link href="/messages" className={showQuotes ? "" : "on"} aria-current={showQuotes ? undefined : "page"}>Messages {count(unread)}</Link>
        <Link href="/messages?tab=quotes" className={showQuotes ? "on" : ""} aria-current={showQuotes ? "page" : undefined}>Quotes {count(waiting.length)}</Link>
      </nav>

      {!showQuotes && (
        <>
          {error && <div className="err">Couldn’t load messages: {error.message}</div>}
          {rows.length === 0 && !error && (
            <div className="empty-state">
              <span className="es-ico"><ChatIcon /></span>
              <h2>No conversations yet</h2>
              <p className="mute">When a company quotes your job, tap “Message” on its quote to chat. Companies can message you about jobs too.</p>
              <Link href="/jobs" className="btn">My jobs</Link>
            </div>
          )}
          <div className="inbox">
            {rows.map((r) => (
              <Link key={r.id} href={`/messages/${r.id}`} className={`card inbox-row${r.unread_count > 0 ? " unread" : ""}`}>
                <Avatar url={r.other_avatar_url} name={r.other_name} />
                <div className="meta">
                  <div className="top"><strong>{r.other_name}</strong>{r.last_at && <span className="mute">{new Date(r.last_at).toLocaleDateString()}</span>}</div>
                  <div className="mute">{r.job_title}</div>
                  <div className="preview">{r.last_sender_id === me ? "You: " : ""}{r.last_body}</div>
                </div>
                <div className="thumb">{r.job_photo ? <img src={r.job_photo} alt="" /> : null}</div>
                {r.unread_count > 0 && <span className="badge-count" aria-label={`${r.unread_count} unread`}>{r.unread_count}</span>}
              </Link>
            ))}
          </div>
        </>
      )}

      {showQuotes && (
        <>
          {qError && <div className="err">Couldn’t load quotes: {qError.message}</div>}
          {quotes.length === 0 && !qError && (
            <div className="empty-state">
              <span className="es-ico"><ChatIcon /></span>
              <h2>No quotes yet</h2>
              <p className="mute">Quotes from companies on your jobs show up here.</p>
              <Link href="/post" className="btn">Post a job</Link>
            </div>
          )}
          {received.length > 0 && <section className="inbox-section"><h2>Quotes on your jobs</h2><div className="inbox">{sortQ(received).map((x) => quoteRow(x, true))}</div></section>}
          {sent.length > 0 && <section className="inbox-section"><h2>Quotes you sent</h2><div className="inbox">{sortQ(sent).map((x) => quoteRow(x, false))}</div></section>}
        </>
      )}
    </>
  );
}
