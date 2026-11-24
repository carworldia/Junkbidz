"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeAvatar } from "@/lib/avatar";
import Avatar from "./Avatar";

const MARKER = "/photos/";

// Pick → center-crop + shrink in the browser → upload to <uid>/avatars/ in the existing photo bucket.
// `onChange` receives the new public URL (or null when removed); it may return an error message to show.
export default function AvatarUploader({ userId, value, name, label, onChange, allowRemove = true }: {
  userId: string; value: string | null; name: string; label: string; allowRemove?: boolean;
  onChange: (url: string | null) => Promise<string | void> | string | void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Best-effort cleanup of the previous file (only ever inside the caller's own avatars folder).
  async function dropOld(url: string | null) {
    const i = url ? url.indexOf(MARKER) : -1;
    if (!url || i < 0) return;
    const path = url.slice(i + MARKER.length);
    if (path.startsWith(`${userId}/avatars/`)) await createClient().storage.from("photos").remove([path]);
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Choose a JPG, PNG or WebP image.");
    if (file.size > 15 * 1024 * 1024) return setError("That image is too large (15 MB max).");
    setBusy(true);
    try {
      const blob = await resizeAvatar(file);
      const path = `${userId}/avatars/${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw new Error(upErr.message);
      const url = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      const problem = await onChange(url);
      if (problem) { await supabase.storage.from("photos").remove([path]); setError(problem); }
      else await dropOld(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true); setError("");
    const problem = await onChange(null);
    if (problem) setError(problem); else await dropOld(value);
    setBusy(false);
  }

  return (
    <div className="avatar-edit">
      <Avatar url={value} name={name} lg />
      <div>
        <div className="mute" style={{ marginBottom: 6 }}>{label}</div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="ghost" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Working…" : value ? "Change photo" : "Upload photo"}
          </button>
          {value && allowRemove && <button type="button" className="ghost" disabled={busy} onClick={remove}>{"Remove"}</button>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
        {error && <div className="err">{error}</div>}
      </div>
    </div>
  );
}
