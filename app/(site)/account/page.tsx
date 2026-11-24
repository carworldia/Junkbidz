import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import SignOut from "@/components/SignOut";
import ThemeSwitch from "@/components/ThemeSwitch";

export const runtime = "edge";
export const metadata: Metadata = { title: "Account" };

export default async function Account() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: p }, { data: hp }, { data: admin }] = await Promise.all([
    supabase.from("profiles").select("display_name, zip, avatar_url").eq("id", user!.id).maybeSingle(),
    supabase.from("hauler_profiles").select("business_name, approval_status").eq("user_id", user!.id).maybeSingle(),
    supabase.rpc("is_admin"),
  ]);
  return (
    <>
      <h1 className="app-h1">Account</h1>
      <p className="mute">Signed in as {user!.email}</p>
      <div className="acct-grid">
        <ProfileForm userId={user!.id} initial={{ display_name: p?.display_name ?? "", zip: p?.zip ?? "", avatar_url: p?.avatar_url ?? null }} />
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Junk removal company</h2>
          {hp ? (
            <>
              <p><strong>{hp.business_name}</strong> · <span className="badge">{hp.approval_status === "approved" ? "Approved" : hp.approval_status === "pending" ? "Under review" : "Not approved"}</span></p>
              <div className="row"><Link className="btn" href="/hauler">Company dashboard</Link><Link className="btn ghost" href="/become-hauler">Edit profile</Link></div>
            </>
          ) : (
            <>
              <p className="mute">Run a junk removal company? Get local jobs sent to you and send quotes.</p>
              <Link className="btn" href="/become-hauler">Join as a company</Link>
            </>
          )}
          {admin === true && <p style={{ marginBottom: 0 }}><Link href="/admin">Open admin →</Link></p>}
        </div>
        <div className="card">
          <ThemeSwitch />
          <div style={{ marginTop: 12 }}><SignOut /></div>
        </div>
      </div>
    </>
  );
}
