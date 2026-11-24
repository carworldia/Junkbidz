import Link from "next/link";
import { TruckIcon } from "@/components/Icons";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import Stars from "@/components/Stars";
import { QUOTE_STATUS, awayLabel, itemsLabel, loadLabel, pickupLabel } from "@/lib/junk";
import { lastPrice, money, quoteWaitingOn, type HaulerProfile, type Lead, type QuoteRow } from "@/lib/types";

export const runtime = "edge";
export const metadata: Metadata = { title: "Company dashboard" };

export default async function HaulerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/hauler");
  const { data: p } = await supabase.from("hauler_profiles").select("*").eq("user_id", user.id).maybeSingle();
  const profile = p as HaulerProfile | null;

  if (!profile) {
    return (
      <div className="card narrow" style={{ textAlign: "center" }}>
        <h1>Company dashboard</h1>
        <p>You haven’t joined as a junk removal company yet.</p>
        <Link className="btn" href="/become-hauler">Join as a company</Link>
      </div>
    );
  }
  const head = (
    <div className="who" style={{ marginBottom: 6 }}>
      <Avatar url={profile.avatar_url} name={profile.business_name} />
      <h1 style={{ margin: 0 }}>{profile.business_name}</h1>
    </div>
  );
  if (profile.approval_status !== "approved") {
    return (
      <div className="card">
        {head}
        <p><span className={`badge ${profile.approval_status === "rejected" ? "declined" : ""}`}>{profile.approval_status === "pending" ? "Under review" : "Not approved"}</span></p>
        <p>{profile.approval_status === "pending"
          ? "Thanks for applying. We’re reviewing your company, and jobs near you will show up here once you’re approved."
          : "Your application wasn’t approved. You can update your details and resubmit."}</p>
        <Link className="btn ghost" href="/become-hauler">Edit profile</Link>
      </div>
    );
  }

  const [{ data: l }, { data: q }, { data: r }] = await Promise.all([
    supabase.rpc("list_leads"),
    supabase.rpc("list_quotes"),
    supabase.rpc("hauler_rating", { p_hauler_id: user.id }),
  ]);
  const leads = ((l ?? []) as Lead[]).filter((x) => !x.my_quote_status || !["submitted", "countered"].includes(x.my_quote_status));
  const quotes = ((q ?? []) as QuoteRow[]).filter((x) => x.hauler_id === user.id);
  const openQuotes = quotes.filter((x) => ["submitted", "countered"].includes(x.status));
  const won = quotes.filter((x) => x.status === "accepted");
  const rating = (r as { rating: number | null; reviews: number }[] | null)?.[0];

  const stat = (label: string, n: number | string) => <div className="stat-card"><dt>{label}</dt><dd>{n}</dd></div>;
  const quoteRow = (x: QuoteRow) => (
    <Link key={x.id} href={`/jobs/${x.job_id}`} className={`card inbox-row${quoteWaitingOn(x, user.id) ? " unread" : ""}`}>
      <div className="meta">
        <div className="top"><strong>{x.job_title}</strong><span className="mute">{new Date(x.updated_at).toLocaleDateString()}</span></div>
        <div className="preview">
          <strong>{money(lastPrice(x))}</strong>{" "}
          {quoteWaitingOn(x, user.id) ? <span className="your-turn">Customer countered. Your turn</span>
            : <span className={`badge ${x.status}`}>{x.status === "accepted" ? (x.job_status === "completed" ? "Done" : "Hired") : x.status === "submitted" ? "Waiting on customer" : QUOTE_STATUS[x.status]}</span>}
        </div>
      </div>
    </Link>
  );

  return (
    <>
      {head}
      <p className="mute">
        <Stars rating={rating?.rating} reviews={rating?.reviews} /> · Jobs within {profile.radius_miles} mi of {profile.zip} · <Link href="/become-hauler">Edit profile</Link>
      </p>
      <dl className="stats" style={{ "--n": 3 } as React.CSSProperties}>{stat("New jobs near you", leads.length)}{stat("Open quotes", openQuotes.length)}{stat("Jobs won", won.length)}</dl>

      <section className="inbox-section">
        <h2>New jobs near you</h2>
        {leads.length === 0 && <p className="mute">No open jobs match your area and items right now. New ones show up here as soon as they’re posted.</p>}
        <div className="jk-list">
          {leads.map((x) => (
            <Link key={x.id} href={`/jobs/${x.id}`} className="card job-card jk-job">
              <div className="jk-thumb">{x.photos[0] ? <img src={x.photos[0]} alt="" /> : <TruckIcon />}</div>
              <div className="jk-body">
                <div className="job-top"><strong>{x.title}</strong>{x.hazardous === "yes" && <span className="badge declined">Hazardous</span>}</div>
                <div className="mute">{itemsLabel(x.item_types)} · {loadLabel(x.load_size)}</div>
                <div className="mute">{pickupLabel(x.pickup_date, x.pickup_window)} · {[x.city, x.zip].filter(Boolean).join(" ")}{awayLabel(x.miles) && <> · {awayLabel(x.miles)}</>}</div>
                <ul className="job-chips">
                  <li><strong>{x.quotes}</strong> {x.quotes === 1 ? "quote" : "quotes"} so far</li>
                  {x.budget != null && <li>Budget {money(x.budget)}</li>}
                  <li className="ok">Send a quote →</li>
                </ul>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {openQuotes.length > 0 && <section className="inbox-section"><h2>Your open quotes</h2><div className="inbox">{openQuotes.map(quoteRow)}</div></section>}
      {won.length > 0 && <section className="inbox-section"><h2>Jobs you won</h2><div className="inbox">{won.map(quoteRow)}</div></section>}
    </>
  );
}
