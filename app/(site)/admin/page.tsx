import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminHaulers, { type AdminHauler } from "@/components/AdminHaulers";
import { JOB_STATUS, itemsLabel } from "@/lib/junk";
import { money } from "@/lib/types";

export const runtime = "edge";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const TABS = [{ k: "overview", label: "Overview" }, { k: "companies", label: "Companies" }, { k: "jobs", label: "Jobs" }, { k: "people", label: "People" }] as const;

type JobRow = { id: string; title: string; status: string; zip: string; city: string | null; item_types: string[]; load_size: string; budget: number | null; created_at: string; customer_email: string; quotes: number; hired_business: string | null };
type Person = { id: string; email: string; display_name: string | null; zip: string | null; created_at: string; last_sign_in_at: string | null; is_admin: boolean; hauler_status: string | null; jobs: number };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  // Default-deny: any error means not an admin. Admin can only be granted in the database (0005_admin.sql).
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) redirect("/");

  const sp = await searchParams;
  const tab = TABS.find((t) => t.k === sp.tab)?.k ?? "overview";
  const { data: ov } = await supabase.rpc("admin_overview");
  const o = (ov ?? {}) as Record<string, number>;

  let body: React.ReactNode = null;
  if (tab === "overview") {
    const tile = (label: string, value: number | undefined, sub?: string, href?: string) => {
      const inner = <><span className="t">{label}</span><b>{(value ?? 0).toLocaleString()}</b>{sub && <small>{sub}</small>}</>;
      return href ? <Link key={label} href={href} className="adm-tile">{inner}</Link> : <div key={label} className="adm-tile">{inner}</div>;
    };
    body = (
      <>
        {(o.haulers_pending ?? 0) > 0 && (
          <Link href="/admin?tab=companies" className="adm-alert"><b>{o.haulers_pending} waiting for you</b><span>Company application{o.haulers_pending === 1 ? "" : "s"} to review</span><span aria-hidden="true">›</span></Link>
        )}
        <div className="adm-tiles">
          {tile("People", o.users, `+${o.users_7d ?? 0} this week`, "/admin?tab=people")}
          {tile("Approved companies", o.haulers, o.haulers_pending ? `${o.haulers_pending} waiting` : undefined, "/admin?tab=companies")}
          {tile("Jobs getting quotes", o.jobs_open, `+${o.jobs_7d ?? 0} posted this week`, "/admin?tab=jobs")}
          {tile("Jobs hired", o.jobs_hired, `${o.jobs_completed ?? 0} completed`)}
          {tile("Quotes this week", o.quotes_7d)}
          {tile("Messages this week", o.messages_7d)}
        </div>
      </>
    );
  } else if (tab === "companies") {
    const { data, error } = await supabase.rpc("admin_list_haulers");
    body = error ? <div className="err">{error.message}</div> : <AdminHaulers rows={(data ?? []) as AdminHauler[]} />;
  } else if (tab === "jobs") {
    const { data, error } = await supabase.rpc("admin_list_jobs");
    const rows = (data ?? []) as JobRow[];
    body = error ? <div className="err">{error.message}</div> : rows.length === 0 ? <p className="mute">No jobs yet.</p> : (
      <div className="jk-list">{rows.map((j) => (
        <div key={j.id} className="card">
          <strong>{j.title}</strong> <span className={`badge st-${j.status}`}>{JOB_STATUS[j.status]}</span>
          <div className="mute">{itemsLabel(j.item_types)} · {[j.city, j.zip].filter(Boolean).join(" ")} · {new Date(j.created_at).toLocaleDateString()}{j.budget != null && <> · budget {money(j.budget)}</>}</div>
          <div className="mute">{j.customer_email} · {j.quotes} quote{j.quotes === 1 ? "" : "s"}{j.hired_business && <> · hired {j.hired_business}</>}</div>
        </div>
      ))}</div>
    );
  } else {
    const { data, error } = await supabase.rpc("admin_list_people");
    const rows = (data ?? []) as Person[];
    body = error ? <div className="err">{error.message}</div> : (
      <div className="jk-list">{rows.map((p) => (
        <div key={p.id} className="card">
          <strong>{p.display_name || p.email}</strong> {p.is_admin && <span className="badge">admin</span>} {p.hauler_status && <span className="badge">company: {p.hauler_status}</span>}
          <div className="mute">{p.email}{p.zip && <> · {p.zip}</>} · joined {new Date(p.created_at).toLocaleDateString()} · {p.jobs} job{p.jobs === 1 ? "" : "s"} posted{p.last_sign_in_at && <> · last seen {new Date(p.last_sign_in_at).toLocaleDateString()}</>}</div>
        </div>
      ))}</div>
    );
  }

  return (
    <>
      <h1 className="app-h1">Admin</h1>
      <nav className="dealer-toggle adm-tabs" aria-label="Admin sections">
        {TABS.map((t) => (
          <Link key={t.k} href={`/admin?tab=${t.k}`} className={tab === t.k ? "on" : ""} aria-current={tab === t.k ? "page" : undefined}>
            {t.label}{t.k === "companies" && (o.haulers_pending ?? 0) > 0 && <span className="badge-count">{o.haulers_pending}</span>}
          </Link>
        ))}
      </nav>
      {body}
    </>
  );
}
