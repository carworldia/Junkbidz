"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChatIcon } from "./Icons";

// Opens (or creates) the chat about this job. A customer passes the company's id; a company passes nothing.
export default function MessageButton({ jobId, haulerId, label = "Message", className = "ghost" }: {
  jobId: string; haulerId?: string; label?: string; className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true); setError("");
    const { data, error } = await createClient().rpc("start_conversation", { p_job_id: jobId, p_hauler_id: haulerId ?? null });
    setBusy(false);
    if (error) return setError(error.message);
    router.push(`/messages/${data}`);
  }
  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={go}><ChatIcon />{busy ? "Opening…" : label}</button>
      {error && <div className="err">{error}</div>}
    </>
  );
}
