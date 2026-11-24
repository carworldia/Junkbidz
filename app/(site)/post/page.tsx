import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JobForm from "@/components/JobForm";
import { BoltIcon, ChatIcon, CheckIcon } from "@/components/Icons";

export const runtime = "edge";
export const metadata: Metadata = { title: "Post a job" };

export default async function PostJob() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/post");
  const { data: p } = await supabase.from("profiles").select("zip").eq("id", user.id).maybeSingle();
  return (
    <>
      <div className="page-intro">
        <h1>Get junk removal quotes</h1>
        <p>Tell us what needs to go. Local junk removal companies send you their price, and you pick the one you want.</p>
        <ul className="intro-points"><li><CheckIcon />Free</li><li><BoltIcon />Quotes fast</li><li><ChatIcon />Chat in the app</li></ul>
      </div>
      <JobForm userId={user.id} defaultZip={p?.zip ?? ""} />
    </>
  );
}
