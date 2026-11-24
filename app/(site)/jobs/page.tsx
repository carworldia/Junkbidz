import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import JobCard from "@/components/JobCard";
import { BoxIcon, PlusIcon } from "@/components/Icons";
import { lastPrice, money, quoteWaitingOn, type Job, type QuoteRow } from "@/lib/types";

export const runtime = "edge";
export const metadata: Metadata = { title: "My jobs" };

export default async function MyJobs() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const me = user!.id;
  const [{ data: j }, { data: q }, { data: hp }] = await Promise.all([
    supabase.from("jobs").select("*").eq("customer_id", me).order("created_at", { ascending: false }),
    supabase.rpc("list_quotes"),
    supabase.from("hauler_profiles").select("user_id").eq("user_id", me).maybeSingle(),
  ]);
  const jobs = (j ?? []) as Job[];
  const quotes = ((q ?? []) as QuoteRow[]).filter((x) => x.customer_id === me);
  const active = jobs.filter((x) => x.status === "open" || x.status === "hired");
  const past = jobs.filter((x) => x.status === "completed" || x.status === "cancelled");

  const card = (job: Job) => {
    const mine = quotes.filter((x) => x.job_id === job.id);
    const hired = mine.find((x) => x.status === "accepted");
    return <JobCard key={job.id} job={job} quotes={mine.length} waiting={mine.filter((x) => quoteWaitingOn(x, me)).length}
      hired={hired ? `Hired ${hired.business_name ?? "a company"} for ${money(lastPrice(hired))}` : null} />;
  };

  return (
    <>
      <div className="jk-head">
        <h1 className="app-h1">My jobs</h1>
        <Link className="btn" href="/post"><PlusIcon />Post a job</Link>
      </div>
      {hp && <p className="mute">Looking for work to quote? Go to your <Link href="/hauler">company dashboard</Link>.</p>}
      {jobs.length === 0 && (
        <div className="empty-state">
          <span className="es-ico"><BoxIcon /></span>
          <h2>No jobs yet</h2>
          <p className="mute">Post what you need hauled away and local companies will send you quotes.</p>
          <Link href="/post" className="btn">Post a job</Link>
        </div>
      )}
      {active.length > 0 && <section className="inbox-section"><h2>Active</h2><div className="jk-list">{active.map(card)}</div></section>}
      {past.length > 0 && <section className="inbox-section"><h2>Past</h2><div className="jk-list">{past.map(card)}</div></section>}
    </>
  );
}
