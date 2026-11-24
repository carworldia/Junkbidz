"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ITEM_TYPES, RADII } from "@/lib/junk";
import type { HaulerProfile } from "@/lib/types";
import AvatarUploader from "./AvatarUploader";

export default function HaulerForm({ userId, existing }: { userId: string; existing: HaulerProfile | null }) {
  const router = useRouter();
  const e = existing;
  const [items, setItems] = useState<string[]>(e?.item_types ?? ITEM_TYPES.filter((x) => x.id !== "other").map((x) => x.id));
  const [logo, setLogo] = useState<string | null>(e?.avatar_url ?? null);
  const [name, setName] = useState(e?.business_name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toggle = (id: string) => setItems((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (items.length === 0) return setError("Choose at least one kind of item you haul.");
    setBusy(true); setError("");
    const f = new FormData(ev.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    if (!/^[0-9]{5}$/.test(s("zip"))) { setBusy(false); return setError("Enter a 5-digit ZIP code."); }
    const fields = {
      business_name: s("business_name"), description: s("description") || null, item_types: items,
      takes_hazardous: f.get("takes_hazardous") === "on", insured: f.get("insured") === "on",
      zip: s("zip"), radius_miles: Number(s("radius_miles")), phone: s("phone"), avatar_url: logo,
    };
    const supabase = createClient();
    const { error } = e
      ? await supabase.from("hauler_profiles").update(fields).eq("user_id", userId)
      : await supabase.from("hauler_profiles").insert({ ...fields, user_id: userId });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/hauler");
    router.refresh();
  }

  return (
    <form className="card form" onSubmit={submit} style={{ maxWidth: 720 }}>
      <h1>{e ? "Edit company profile" : "Join as a junk removal company"}</h1>
      <p className="mute" style={{ margin: 0 }}>
        {e ? "Changing your name, area or what you haul sends your profile back for a quick review."
           : "Get local jobs sent to you and quote the ones you want. Free to join. We review every company before it can quote."}
      </p>
      <AvatarUploader userId={userId} value={logo} name={name || "Company"} label="Logo (optional): shown next to your quotes and messages" onChange={(u) => { setLogo(u); }} />
      <label>Company name<input name="business_name" required minLength={2} maxLength={80} defaultValue={e?.business_name} onChange={(x) => setName(x.target.value)} /></label>
      <label>About your company (optional)
        <textarea name="description" maxLength={2000} defaultValue={e?.description ?? ""} placeholder="Crew size, truck size, years in business, whether you donate or recycle…" />
      </label>
      <fieldset className="jk-fieldset">
        <legend>What do you haul?</legend>
        <div className="jk-checks">
          {ITEM_TYPES.map((c) => (
            <label className="check" key={c.id}><input type="checkbox" checked={items.includes(c.id)} onChange={() => toggle(c.id)} /> {c.label}</label>
          ))}
        </div>
        <label className="check"><input type="checkbox" name="takes_hazardous" defaultChecked={e?.takes_hazardous ?? false} /> We take hazardous items (paint, chemicals, tires…) where allowed</label>
      </fieldset>
      <div className="row">
        <label>Business ZIP<input name="zip" required inputMode="numeric" maxLength={5} pattern="[0-9]{5}" defaultValue={e?.zip} /></label>
        <label>Send me jobs within
          <select name="radius_miles" defaultValue={e?.radius_miles ?? 25}>
            {RADII.map((r) => <option key={r} value={r}>{r} miles</option>)}
          </select>
        </label>
        <label>Phone<input name="phone" type="tel" required minLength={7} maxLength={25} defaultValue={e?.phone} autoComplete="tel" /></label>
      </div>
      <label className="check"><input type="checkbox" name="insured" defaultChecked={e?.insured ?? false} /> We carry liability insurance</label>
      <p className="mute" style={{ margin: 0 }}>Your phone number is only shown to a customer after they hire you.</p>
      {error && <div className="err">{error}</div>}
      <button disabled={busy}>{busy ? "Saving…" : e ? "Save changes" : "Submit application"}</button>
    </form>
  );
}
