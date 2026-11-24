"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AvatarUploader from "./AvatarUploader";

export default function ProfileForm({ userId, initial }: { userId: string; initial: { display_name: string; zip: string; avatar_url: string | null } }) {
  const router = useRouter();
  const [name, setName] = useState(initial.display_name);
  const [zip, setZip] = useState(initial.zip);
  const [avatar, setAvatar] = useState(initial.avatar_url);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const supabase = createClient();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (zip && !/^[0-9]{5}$/.test(zip)) return setMsg({ ok: false, text: "Enter a 5-digit ZIP code." });
    setBusy(true); setMsg(null);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() || null, zip: zip || null }).eq("id", userId);
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) router.refresh();
  }

  return (
    <form className="card form" onSubmit={save}>
      <h2 style={{ margin: 0 }}>Your profile</h2>
      <AvatarUploader userId={userId} value={avatar} name={name || "You"} label="Profile photo (optional)"
        onChange={async (url) => {
          const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
          if (error) return error.message;
          setAvatar(url);
        }} />
      <label>Name companies see<input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Sam" /></label>
      <label>Your ZIP<input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" /></label>
      {msg && <div className={msg.ok ? "note" : "err"}>{msg.text}</div>}
      <button disabled={busy}>{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}
