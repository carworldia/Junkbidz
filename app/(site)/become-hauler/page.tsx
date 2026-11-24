import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HaulerForm from "@/components/HaulerForm";
import type { HaulerProfile } from "@/lib/types";

export const runtime = "edge";
export const metadata: Metadata = { title: "Join as a company" };

export default async function BecomeHauler() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/become-hauler");
  const { data } = await supabase.from("hauler_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return <HaulerForm userId={user.id} existing={(data as HaulerProfile) ?? null} />;
}
