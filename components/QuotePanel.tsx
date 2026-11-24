"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { lastPrice, money, type QuoteRow } from "@/lib/types";
import { QUOTE_STATUS, awayLabel } from "@/lib/junk";
import Avatar from "./Avatar";
import Stars from "./Stars";
import MessageButton from "./MessageButton";
import { ShieldIcon } from "./Icons";

const OPEN = ["submitted", "countered"];

// Customer: every quote on the job, cheapest open one first, each with Hire / Counter / Decline / Message.
// Company: a form to send a quote, then its own quote with the back-and-forth.
export default function QuotePanel({ jobId, isCustomer, jobOpen, budget, quotes }: {
  jobId: string; isCustomer: boolean; jobOpen: boolean; budget: number | null; quotes: QuoteRow[];
}) {
  const hasOpen = quotes.some((q) => OPEN.includes(q.status));
  const sorted = [...quotes].sort((a, b) =>
    Number(b.status === "accepted") - Number(a.status === "accepted")
    || Number(OPEN.includes(b.status)) - Number(OPEN.includes(a.status))
    || lastPrice(a) - lastPrice(b));
  const cheapest = sorted.find((q) => OPEN.includes(q.status))?.id;

  return (
    <div>
      {!isCustomer && jobOpen && !hasOpen && <NewQuote jobId={jobId} budget={budget} again={quotes.length > 0} />}
      {!isCustomer && !jobOpen && quotes.length === 0 && <p className="mute">This job isn’t taking quotes anymore.</p>}
      {isCustomer && quotes.length === 0 && jobOpen && (
        <div className="empty-state compact">
          <h3>Waiting for quotes</h3>
          <p className="mute">Junk removal companies near you can see your job now. Quotes show up here, and you’ll see a badge on your Inbox.</p>
        </div>
      )}
      {sorted.map((q) => <QuoteCard key={q.id} quote={q} isCustomer={isCustomer} jobOpen={jobOpen} best={q.id === cheapest && sorted.length > 1} />)}
    </div>
  );
}

function NewQuote({ jobId, budget, again }: { jobId: string; budget: number | null; again: boolean }) {
  const router = useRouter();
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await createClient().rpc("submit_quote", { p_job_id: jobId, p_price: Number(price), p_message: message || null });
    setBusy(false);
    if (error) setError(error.message); else { setPrice(""); setMessage(""); router.refresh(); }
  }

  return (
    <form className="form quote-new" onSubmit={submit}>
      <h3 style={{ margin: 0 }}>{again ? "Send a new quote" : "Send your quote"}</h3>
      <label>Your price, all-in (USD){budget != null && <> · customer’s budget {money(budget)}</>}
        <input type="number" min={1} step="any" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>
      <label>Message (when you can come, what’s included)
        <textarea style={{ minHeight: 80 }} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Two-person crew, can come Saturday morning. Price includes loading, hauling and disposal." />
      </label>
      {error && <div className="err">{error}</div>}
      <button disabled={busy}>{busy ? "Sending…" : "Send quote"}</button>
    </form>
  );
}

function QuoteCard({ quote, isCustomer, jobOpen, best }: { quote: QuoteRow; isCustomer: boolean; jobOpen: boolean; best: boolean }) {
  const router = useRouter();
  const [counter, setCounter] = useState("");
  const [message, setMessage] = useState("");
  const [showCounter, setShowCounter] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const open = OPEN.includes(quote.status);
  const me = isCustomer ? "customer" : "hauler";
  const last = quote.rounds[quote.rounds.length - 1];
  const myTurn = open && jobOpen && last?.by !== me;
  const name = quote.business_name ?? "Company";
  const price = lastPrice(quote);

  async function act(action: "accept" | "decline" | "counter" | "withdraw") {
    if (action === "accept" && !confirm(isCustomer ? `Hire ${name} for ${money(price)}? Other quotes will be closed.` : `Accept ${money(price)}?`)) return;
    if (action === "withdraw" && !confirm("Withdraw your quote?")) return;
    setBusy(true); setError("");
    const { error } = await createClient().rpc("respond_quote", {
      p_quote_id: quote.id, p_action: action,
      p_price: action === "counter" ? Number(counter) : null, p_message: message || null,
    });
    setBusy(false);
    if (error) setError(error.message); else { setCounter(""); setMessage(""); setShowCounter(false); router.refresh(); }
  }

  const verb = (a?: string) => a === "accept" ? "accepted" : a === "decline" ? "declined" : a === "withdraw" ? "withdrew" : a === "counter" ? "countered" : "quoted";
  const who = (by: string) => by === me ? "You" : by === "hauler" ? name : "Customer";

  return (
    <article className={`quote-card${quote.status === "accepted" ? " hired" : ""}${!open && quote.status !== "accepted" ? " closed" : ""}`}>
      <header className="qc-head">
        {isCustomer && <Avatar url={quote.hauler_avatar_url} name={name} />}
        <div className="qc-who">
          {isCustomer ? <strong>{name}</strong> : <strong>Your quote</strong>}
          {isCustomer && (
            <span className="qc-meta">
              <Stars rating={quote.rating} reviews={quote.reviews} />
              {quote.insured && <span className="qc-ins"><ShieldIcon />Insured</span>}
              {awayLabel(quote.miles) && <span>{awayLabel(quote.miles)}</span>}
            </span>
          )}
        </div>
        <div className="qc-price">
          <b>{money(price)}</b>
          {best && open && <span className="badge accepted">Lowest</span>}
          {!best && <span className={`badge ${quote.status}`}>{!isCustomer && quote.status === "submitted" ? "Sent" : !isCustomer && quote.status === "countered" ? "Customer countered" : QUOTE_STATUS[quote.status] ?? quote.status}</span>}
        </div>
      </header>

      {quote.status === "accepted" && isCustomer && quote.hauler_phone && (
        <div className="note">You hired {name}. Call or text: <a href={`tel:${quote.hauler_phone}`}>{quote.hauler_phone}</a></div>
      )}
      {quote.status === "accepted" && !isCustomer && <div className="note">You got the job. The pickup address is shown above.</div>}

      <ol className="qc-rounds">
        {quote.rounds.map((r, i) => (
          <li key={i}>
            <span><strong>{who(r.by)}</strong> {verb(r.action)}{r.action !== "decline" && r.action !== "withdraw" && <> <strong>{money(r.price)}</strong></>}</span>
            {r.message && <q>{r.message}</q>}
            <time className="mute">{new Date(r.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
          </li>
        ))}
      </ol>

      {open && jobOpen && (
        <div className="qc-actions">
          {myTurn ? (
            <div className="row">
              <button className="ok" disabled={busy} onClick={() => act("accept")}>{isCustomer ? `Hire for ${money(price)}` : `Accept ${money(price)}`}</button>
              <button className="ghost" disabled={busy} onClick={() => setShowCounter((s) => !s)}>Counter</button>
              {isCustomer && <button className="ghost danger-text" disabled={busy} onClick={() => act("decline")}>Decline</button>}
            </div>
          ) : <p className="mute" style={{ margin: 0 }}>{isCustomer ? `Waiting for ${name} to answer your counter.` : "Waiting for the customer."}</p>}
          {showCounter && myTurn && (
            <div className="form" style={{ marginTop: 10 }}>
              <div className="row">
                <label>Your price<input type="number" min={1} step="any" inputMode="decimal" value={counter} onChange={(e) => setCounter(e.target.value)} /></label>
                <label>Note (optional)<input maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
              </div>
              <button disabled={busy || !counter} onClick={() => act("counter")}>Send counter</button>
            </div>
          )}
        </div>
      )}

      <div className="row qc-foot">
        {(open || quote.status === "accepted") && (
          isCustomer ? <MessageButton jobId={quote.job_id} haulerId={quote.hauler_id} label={`Message ${name}`} />
                     : <MessageButton jobId={quote.job_id} label="Message customer" />
        )}
        {!isCustomer && open && <button className="ghost" disabled={busy} onClick={() => act("withdraw")}>Withdraw quote</button>}
      </div>
      {error && <div className="err">{error}</div>}
    </article>
  );
}
