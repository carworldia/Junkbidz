"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { itemsLabel } from "@/lib/junk";
import Avatar from "./Avatar";

export type AdminHauler = {
  user_id: string; email: string; business_name: string; description: string | null; item_types: string[];
  takes_hazardous: boolean; insured: boolean; zip: string; radius_miles: number; phone: string; avatar_url: string | null;
  approval_status: "pending" | "approved" | "rejected"; created_at: string; quotes: number; jobs_won: number; rating: number | null; reviews: number;
};

export default function AdminHaulers({ rows }: { rows: AdminHauler[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function set(id: string, status: string) {
    setBusy(id); setError("");
    const { error } = await createClient().rpc("admin_set_hauler_status", { p_user_id: id, p_status: status });
    setBusy(null);
    if (error) setError(error.message); else router.refresh();
  }
  if (rows.length === 0) return <p className="mute">No companies have applied yet.</p>;
  return (
    <div className="jk-list">
      {error && <div className="err">{error}</div>}
      {rows.map((h) => (
        <div key={h.user_id} className={`card adm-hauler${h.approval_status === "pending" ? " unread" : ""}`}>
          <div className="who">
            <Avatar url={h.avatar_url} name={h.business_name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{h.business_name}</strong> <span className={`badge ${h.approval_status === "approved" ? "accepted" : h.approval_status === "rejected" ? "declined" : ""}`}>{h.approval_status}</span>
              <div className="mute">{h.email} · {h.phone}</div>
            </div>
          </div>
          <div className="mute" style={{ marginTop: 6 }}>
            ZIP {h.zip} · within {h.radius_miles} mi · {h.insured ? "insured" : "not insured"}{h.takes_hazardous ? " · takes hazardous" : ""} · applied {new Date(h.created_at).toLocaleDateString()}
          </div>
          <div className="mute">{itemsLabel(h.item_types)}</div>
          {h.description && <p style={{ margin: "6px 0", whiteSpace: "pre-wrap" }}>{h.description}</p>}
          <div className="mute">{h.quotes} quotes · {h.jobs_won} jobs won{h.reviews ? ` · ★ ${h.rating} (${h.reviews})` : ""}</div>
          <div className="row" style={{ marginTop: 8 }}>
            {h.approval_status !== "approved" && <button className="ok" disabled={busy === h.user_id} onClick={() => set(h.user_id, "approved")}>Approve</button>}
            {h.approval_status !== "rejected" && <button className="ghost danger-text" disabled={busy === h.user_id} onClick={() => set(h.user_id, "rejected")}>{h.approval_status === "approved" ? "Remove approval" : "Reject"}</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
