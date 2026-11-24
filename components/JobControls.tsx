"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// The customer's buttons for their own job.
export default function JobControls({ id, status, hiredName }: { id: string; status: string; hiredName?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function set(next: "completed" | "cancelled" | "open") {
    const ask = next === "cancelled" ? "Cancel this job? Companies will be told it's no longer needed."
      : next === "open" ? `Reopen the job? ${hiredName ?? "The company you hired"} will be told, and other companies can quote again.`
      : "Mark this job as done?";
    if (!confirm(ask)) return;
    setBusy(true); setError("");
    const { error } = await createClient().rpc("set_job_status", { p_job_id: id, p_status: next });
    setBusy(false);
    if (error) setError(error.message); else router.refresh();
  }
  return (
    <div className="job-controls">
      <div className="row">
        {status === "hired" && <button className="ok" disabled={busy} onClick={() => set("completed")}>Mark job done</button>}
        {status === "hired" && <button className="ghost" disabled={busy} onClick={() => set("open")}>Reopen for quotes</button>}
        {(status === "open" || status === "hired") && <button className="ghost danger-text" disabled={busy} onClick={() => set("cancelled")}>Cancel job</button>}
      </div>
      {error && <div className="err">{error}</div>}
    </div>
  );
}
