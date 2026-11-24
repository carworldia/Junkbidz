"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ITEM_TYPES, LOAD_SIZES, autoTitle, itemsLabel, loadLabel } from "@/lib/junk";
import { money } from "@/lib/types";
import Avatar from "./Avatar";
import Stars from "./Stars";
import { ChatIcon, CheckIcon, ShieldIcon, TruckIcon } from "./Icons";

// Guest demo: the whole customer flow (post → quotes → compare → chat → hire → review) runs in the browser with
// made-up companies. Nothing is saved, nothing is sent to real companies, no account needed.

type Co = { id: string; name: string; rating: number | null; reviews: number; miles: number; insured: boolean; base: number; note: string; replies: string[] };
const COMPANIES: Co[] = [
  { id: "a", name: "Bridge City Hauling", rating: 4.9, reviews: 112, miles: 2, insured: true, base: 1.0, note: "Two of us can come Thursday morning. Price covers loading, hauling and disposal.", replies: ["Hi! Yes, we can carry it down the stairs, no extra charge.", "Thursday 9–11 AM works. Just hire us in the app and we'll lock it in."] },
  { id: "b", name: "Greenline Removal", rating: 4.7, reviews: 64, miles: 4, insured: true, base: 1.2, note: "We can do Saturday. We donate anything in good shape.", replies: ["Thanks for asking! We donate or recycle about 70% of what we pick up.", "Saturday afternoon is open if that suits you."] },
  { id: "c", name: "Northwest Junk Co.", rating: null, reviews: 0, miles: 6, insured: false, base: 1.35, note: "Available tomorrow afternoon.", replies: ["Hey! We're a new crew but we've got a big truck.", "We could come tomorrow around 3."] },
];
const BASE_PRICE: Record<string, number> = { single: 95, small: 165, half: 245, full: 420, multiple: 650 };
const PHOTO_COLORS = ["#c7d2fe", "#fde68a", "#bbf7d0"];

type Msg = { mine: boolean; body: string };

export default function Demo() {
  const [step, setStep] = useState<"post" | "sending" | "quotes" | "hired" | "done">("post");
  const [items, setItems] = useState<string[]>(["furniture", "appliances"]);
  const [load, setLoad] = useState("half");
  const [zip, setZip] = useState("97214");
  const [arrived, setArrived] = useState(0);
  const [chatWith, setChatWith] = useState<Co | null>(null);
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [hired, setHired] = useState<Co | null>(null);
  const [stars, setStars] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  const price = (c: Co) => Math.round((BASE_PRICE[load] ?? 200) * c.base / 5) * 5;
  const title = autoTitle(items);
  const top = () => window.scrollTo({ top: 0, behavior: "smooth" });

  function post(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    setStep("sending"); setArrived(0); top();
    later(1400, () => { setStep("quotes"); setArrived(1); });
    later(3000, () => setArrived(2));
    later(4600, () => setArrived(3));
  }

  function send(c: Co, body: string) {
    const n = (chats[c.id] ?? []).filter((m) => m.mine).length;
    setChats((p) => ({ ...p, [c.id]: [...(p[c.id] ?? []), { mine: true, body }] }));
    later(1100, () => setChats((p) => ({ ...p, [c.id]: [...(p[c.id] ?? []), { mine: false, body: c.replies[Math.min(n, c.replies.length - 1)] }] })));
  }

  function restart() { timers.current.forEach(clearTimeout); setStep("post"); setArrived(0); setChats({}); setHired(null); setStars(0); setChatWith(null); top(); }

  const shown = COMPANIES.slice(0, arrived).sort((a, b) => price(a) - price(b));

  return (
    <div className="demo">
      <div className="demo-banner" role="note">
        <b>Demo mode</b> Try it out: nothing is saved and no real companies are contacted.
        <button type="button" className="ghost" onClick={restart}>Start over</button>
      </div>

      <ol className="demo-steps" aria-label="Demo progress">
        {["Post", "Get quotes", "Hire", "Done"].map((s, i) => {
          const at = { post: 0, sending: 1, quotes: 1, hired: 2, done: 3 }[step];
          return <li key={s} className={i < at ? "past" : i === at ? "on" : undefined}>{i < at ? <CheckIcon /> : <span>{i + 1}</span>}{s}</li>;
        })}
      </ol>

      {step === "post" && (
        <form className="card form sell-form" onSubmit={post} style={{ maxWidth: 720 }}>
          <h1 style={{ margin: 0 }}>1. Post your job</h1>
          <p className="mute" style={{ margin: 0 }}>We filled in an example for you. Change anything you like, then tap Post.</p>
          <section className="fsec">
            <h2>What needs to go?</h2>
            <div className="svc-grid">
              {ITEM_TYPES.slice(0, 6).map((c) => (
                <button key={c.id} type="button" role="checkbox" aria-checked={items.includes(c.id)} className="svc-tile"
                  onClick={() => setItems((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))}>
                  <b>{c.label}</b><small>{c.hint}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="fsec">
            <h2>About how much?</h2>
            <div className="svc-grid load-grid">
              {LOAD_SIZES.slice(0, 4).map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={load === c.id} className="svc-tile" onClick={() => setLoad(c.id)}>
                  <b>{c.label}</b><small>{c.hint}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="fsec">
            <h2>Photos</h2>
            <div className="demo-photos">{PHOTO_COLORS.map((c, i) => <span key={i} style={{ background: c }}><TruckIcon /></span>)}</div>
            <small className="mute">Example photos. In the real app you add at least 3 of your own.</small>
          </section>
          <label>ZIP code<input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" /></label>
          {!items.length && <div className="err">Pick at least one item.</div>}
          <button className="publish" disabled={!items.length}>Post job and get quotes</button>
        </form>
      )}

      {step === "sending" && (
        <div className="card demo-sending">
          <span className="demo-pulse" aria-hidden="true"><TruckIcon /></span>
          <h2>Sending your job to junk removal companies near {zip || "you"}…</h2>
          <p className="mute">In the real app, approved companies in your area get it right away.</p>
        </div>
      )}

      {(step === "quotes" || step === "hired" || step === "done") && (
        <div className="detail">
          <div>
            <div className="card">
              <h1 style={{ marginBottom: 6 }}>{title}</h1>
              <span className={`badge st-${hired ? (step === "done" ? "completed" : "hired") : "open"}`}>{hired ? (step === "done" ? "Done" : "Hired") : "Getting quotes"}</span>
              <div className="specs">
                <span className="mute">Items</span><span>{itemsLabel(items)}</span>
                <span className="mute">Amount</span><span>{loadLabel(load)}</span>
                <span className="mute">Area</span><span>{zip}</span>
                <span className="mute">Address</span><span>123 Example St <small className="mute">(only the company you hire sees this)</small></span>
              </div>
              <div className="demo-photos small">{PHOTO_COLORS.map((c, i) => <span key={i} style={{ background: c }}><TruckIcon /></span>)}</div>
            </div>
          </div>
          <div>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{hired ? "You hired" : `Quotes (${arrived})`}</h2>
              {!hired && arrived < 3 && <p className="mute demo-waiting"><span className="demo-dot" />More quotes coming in…</p>}
              {(hired ? [hired] : shown).map((c, i) => (
                <article key={c.id} className={`quote-card demo-in${hired ? " hired" : ""}`}>
                  <header className="qc-head">
                    <Avatar name={c.name} />
                    <div className="qc-who">
                      <strong>{c.name}</strong>
                      <span className="qc-meta"><Stars rating={c.rating} reviews={c.reviews} />{c.insured && <span className="qc-ins"><ShieldIcon />Insured</span>}<span>{c.miles} mi away</span></span>
                    </div>
                    <div className="qc-price"><b>{money(price(c))}</b>{!hired && i === 0 && shown.length > 1 && <span className="badge accepted">Lowest</span>}</div>
                  </header>
                  <ol className="qc-rounds"><li><span><strong>{c.name}</strong> quoted <strong>{money(price(c))}</strong></span><q>{c.note}</q></li></ol>
                  {hired ? (
                    <div className="note">You hired {c.name} for {money(price(c))}. Their phone number is now shown to you, and they can see your address. Other quotes were closed automatically.</div>
                  ) : (
                    <div className="row qc-foot">
                      <button className="ok" onClick={() => { setHired(c); setChatWith(null); setStep("hired"); top(); }}>Hire for {money(price(c))}</button>
                      <button className="ghost" onClick={() => setChatWith(c)}><ChatIcon />Message</button>
                    </div>
                  )}
                </article>
              ))}
              {step === "hired" && (
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="ok" onClick={() => { setStep("done"); top(); }}>Mark job done</button>
                  <button className="ghost" onClick={() => hired && setChatWith(hired)}><ChatIcon />Message {hired?.name}</button>
                </div>
              )}
              {step === "done" && hired && (
                <div className="review-box" style={{ marginTop: 12 }}>
                  <h3 style={{ margin: "0 0 6px" }}>How did {hired.name} do?</h3>
                  <div className="star-pick">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={n <= stars ? "on" : undefined} aria-label={`${n} stars`} onClick={() => setStars(n)}>★</button>)}</div>
                  {stars > 0 && <p className="note">Thanks! Reviews help the next customer choose.</p>}
                </div>
              )}
            </div>
            {step === "done" && (
              <div className="card demo-end">
                <h2>That’s how JunkBidz works.</h2>
                <p className="mute">Post a real job for free. Local companies send real quotes, and you choose.</p>
                <div className="row"><Link className="btn" href="/post">Post a real job</Link><button className="ghost" onClick={restart}>Try the demo again</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {chatWith && (
        <div className="demo-chat-wrap" role="dialog" aria-label={`Chat with ${chatWith.name}`}>
          <div className="demo-chat card">
            <div className="chat-head">
              <Avatar name={chatWith.name} />
              <div className="chat-who"><h2 style={{ margin: 0, fontSize: "1.05rem" }}>{chatWith.name}</h2><small className="mute">Demo chat · replies are automatic</small></div>
              <button type="button" className="ghost" onClick={() => setChatWith(null)} aria-label="Close chat">✕</button>
            </div>
            <div className="chat-log">
              {(chats[chatWith.id] ?? []).length === 0 && <p className="mute" style={{ textAlign: "center" }}>Ask them anything. Try “Can you carry it down stairs?”</p>}
              {(chats[chatWith.id] ?? []).map((m, i) => <div key={i} className={`bubble ${m.mine ? "mine" : "theirs"}`}><div>{m.body}</div></div>)}
            </div>
            <DemoInput onSend={(b) => send(chatWith, b)} />
          </div>
        </div>
      )}
    </div>
  );
}

function DemoInput({ onSend }: { onSend: (body: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form className="chat-input" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onSend(v.trim()); setV(""); } }}>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Write a message…" aria-label="Message" autoComplete="off" />
      <button disabled={!v.trim()}>Send</button>
    </form>
  );
}
