import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuotePanel from "@/components/QuotePanel";
import JobControls from "@/components/JobControls";
import ReviewBox from "@/components/ReviewBox";
import MessageButton from "@/components/MessageButton";
import { JOB_STATUS, accessLabel, hazardLabel, itemsLabel, loadLabel, pickupLabel } from "@/lib/junk";
import { money, type Job, type QuoteRow } from "@/lib/types";

export const runtime = "edge";

export default async function JobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string }> }) {
  const { id } = await params;
  const { posted } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // The database decides who can see this: the customer, companies it was sent to, and companies that quoted.
  const { data } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const job = data as Job;
  const isCustomer = job.customer_id === user.id;
  const jobOpen = job.status === "open";

  const [{ data: q, error }, { data: addr }, { data: rv }] = await Promise.all([
    supabase.rpc("list_quotes", { p_job_id: id }),
    // Only the customer and the company they hired can read the address (enforced in the database).
    supabase.from("job_addresses").select("address, access_notes").eq("job_id", id).maybeSingle(),
    isCustomer ? supabase.from("job_reviews").select("rating, body").eq("job_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const quotes = (q ?? []) as QuoteRow[];
  const hired = quotes.find((x) => x.status === "accepted");

  return (
    <>
      <p style={{ margin: "0 0 8px" }}><Link href={isCustomer ? "/jobs" : "/hauler"} className="mute">← {isCustomer ? "My jobs" : "Company dashboard"}</Link></p>
      {posted && isCustomer && <div className="card posted-note"><strong>Your job is live.</strong> Junk removal companies near you can see it now. Quotes will show up below.</div>}
      <div className="detail">
        <div>
          {job.photos.length > 0 && (
            <div className="jk-photos">{job.photos.map((p) => <a key={p} href={p} target="_blank" rel="noreferrer"><img src={p} alt="" /></a>)}</div>
          )}
          <div className="card">
            <h1 style={{ marginBottom: 6 }}>{job.title}</h1>
            <span className={`badge st-${job.status}`}>{JOB_STATUS[job.status]}</span>
            <div className="specs">
              <span className="mute">Items</span><span>{itemsLabel(job.item_types)}</span>
              <span className="mute">Amount</span><span>{loadLabel(job.load_size)}</span>
              <span className="mute">Where</span><span>{accessLabel(job.access)}</span>
              <span className="mute">Hazardous</span><span>{hazardLabel(job.hazardous)}</span>
              <span className="mute">Pickup</span><span>{pickupLabel(job.pickup_date, job.pickup_window)}</span>
              <span className="mute">Area</span><span>{[job.city, job.zip].filter(Boolean).join(" ")}</span>
              {addr && <><span className="mute">Address</span><span><strong>{addr.address}</strong>{addr.access_notes && <><br /><span className="mute">{addr.access_notes}</span></>}</span></>}
              {job.budget != null && <><span className="mute">Budget</span><span>{money(job.budget)}</span></>}
              <span className="mute">Posted</span><span>{new Date(job.created_at).toLocaleDateString()}</span>
            </div>
            {job.description && <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{job.description}</p>}
            {!isCustomer && !addr && <p className="mute" style={{ marginBottom: 0 }}>The exact address is shared once the customer hires you.</p>}
            {isCustomer && <JobControls id={job.id} status={job.status} hiredName={hired?.business_name} />}
          </div>
        </div>
        <div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{isCustomer ? `Quotes${quotes.length ? ` (${quotes.length})` : ""}` : "Your quote"}</h2>
            {error && <div className="err">{error.message}</div>}
            <QuotePanel jobId={job.id} isCustomer={isCustomer} jobOpen={jobOpen} budget={job.budget} quotes={quotes} />
            {!isCustomer && jobOpen && quotes.length === 0 && (
              <div className="row" style={{ marginTop: 10 }}><MessageButton jobId={job.id} label="Ask the customer a question" /></div>
            )}
          </div>
          {isCustomer && hired && job.status === "completed" && (
            <div style={{ marginTop: 16 }}><ReviewBox jobId={job.id} name={hired.business_name ?? "the company"} existing={(rv as { rating: number; body: string | null } | null) ?? null} /></div>
          )}
        </div>
      </div>
    </>
  );
}
