"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ReviewBox({ jobId, name, existing }: { jobId: string; name: string; existing: { rating: number; body: string | null } | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Choose 1 to 5 stars.");
    setBusy(true); setError("");
    const { error } = await createClient().rpc("leave_review", { p_job_id: jobId, p_rating: rating, p_body: body || null });
    setBusy(false);
    if (error) setError(error.message); else { setSaved(true); router.refresh(); }
  }

  return (
    <form className="card form review-box" onSubmit={save}>
      <h2 style={{ margin: 0 }}>{existing ? "Your review" : `How did ${name} do?`}</h2>
      <div className="star-pick" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={n <= rating ? "on" : undefined} onClick={() => { setRating(n); setSaved(false); }}>★</button>
        ))}
      </div>
      <label>A few words for other customers (optional)
        <textarea maxLength={1000} value={body} onChange={(e) => { setBody(e.target.value); setSaved(false); }} style={{ minHeight: 70 }} />
      </label>
      {error && <div className="err">{error}</div>}
      {saved && <div className="note">Thanks! Your review is saved.</div>}
      <button disabled={busy}>{busy ? "Saving…" : existing ? "Update review" : "Post review"}</button>
    </form>
  );
}
