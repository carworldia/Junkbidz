"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACCESS, HAZARDOUS, ITEM_TYPES, LOAD_SIZES, WINDOWS, autoTitle } from "@/lib/junk";
import PhotoUploader from "./PhotoUploader";

const MIN_PHOTOS = 3;   // also enforced in the database (jobs_min_3_photos, migration 0006)

// Post a job: what, how much, where, when. Goes to every approved company whose area covers the ZIP.
export default function JobForm({ userId, defaultZip }: { userId: string; defaultZip: string }) {
  const router = useRouter();
  const [items, setItems] = useState<string[]>([]);
  const [load, setLoad] = useState("");
  const [hazard, setHazard] = useState("no");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const toggle = (id: string) => { setItems((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); setError(""); };
  const fail = (msg: string, anchor?: string) => {
    setBusy(false); setError(msg);
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    if (items.length === 0) return fail("Choose what needs to go (furniture, appliances…).", "items-h");
    if (!load) return fail("Choose about how much there is.", "load-h");
    if (!/^[0-9]{5}$/.test(s("zip"))) return fail("Enter a 5-digit ZIP code.");
    if (s("address").length < 5) return fail("Enter the pickup address. Only the company you hire will see it.");
    if (uploading) return fail("Wait for the photos to finish uploading.");
    if (photos.length < MIN_PHOTOS) return fail(`Add at least ${MIN_PHOTOS} photos so companies can give an accurate quote.`, "photos-h");

    const supabase = createClient();
    const { data, error } = await supabase.from("jobs").insert({
      customer_id: userId,
      title: s("title") || autoTitle(items),
      item_types: items, load_size: load, access: s("access"), hazardous: hazard,
      description: s("description"), photos,
      zip: s("zip"), city: s("city") || null,
      pickup_date: s("pickup_date") || null, pickup_window: s("pickup_window"),
      budget: s("budget") ? Number(s("budget")) : null,
    }).select("id").single();
    if (error) return fail(error.message);

    const { error: addrErr } = await supabase.from("job_addresses").insert({
      job_id: data.id, customer_id: userId, address: s("address"), access_notes: s("access_notes") || null,
    });
    if (addrErr) return fail(`Your job was posted, but the address didn't save: ${addrErr.message}`);

    // Remember the ZIP for next time.
    if (!defaultZip) await supabase.from("profiles").update({ zip: s("zip") }).eq("id", userId);
    router.push(`/jobs/${data.id}?posted=1`);
    router.refresh();
  }

  return (
    <form className="card form sell-form" onSubmit={submit} style={{ maxWidth: 720 }}>
      <section className="fsec">
        <h2 id="items-h">What needs to go?</h2>
        <p className="mute" style={{ margin: "0 0 8px" }}>Pick everything that applies.</p>
        <div className="svc-grid" role="group" aria-labelledby="items-h">
          {ITEM_TYPES.map((c) => (
            <button key={c.id} type="button" role="checkbox" aria-checked={items.includes(c.id)} className="svc-tile" onClick={() => toggle(c.id)}>
              <b>{c.label}</b><small>{c.hint}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="fsec">
        <h2 id="load-h">About how much?</h2>
        <div className="svc-grid load-grid" role="radiogroup" aria-labelledby="load-h">
          {LOAD_SIZES.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={load === c.id} className="svc-tile" onClick={() => { setLoad(c.id); setError(""); }}>
              <b>{c.label}</b><small>{c.hint}</small>
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <label>Where is it?
            <select name="access" defaultValue="curbside">
              {ACCESS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
        </div>
        <div className="dist-field" role="radiogroup" aria-labelledby="haz-h" style={{ marginTop: 12 }}>
          <span className="yn-label" id="haz-h">Any paint, chemicals, tires, batteries or other hazardous items?</span>
          <div className="dist-pick">
            {HAZARDOUS.map((h) => (
              <label key={h.id} className={hazard === h.id ? "on" : undefined}>
                <input type="radio" name="hazardous" value={h.id} checked={hazard === h.id} onChange={() => setHazard(h.id)} />{h.label}
              </label>
            ))}
          </div>
          {hazard !== "no" && <small className="mute">Only companies that take hazardous items will see this job. List them in the details.</small>}
        </div>
      </section>

      <section className="fsec">
        <h2 id="photos-h">Photos</h2>
        <p className="mute" style={{ margin: "0 0 8px" }}>Add at least {MIN_PHOTOS} photos of everything that needs to go, from a few angles. It gets you accurate quotes.</p>
        <PhotoUploader userId={userId} photos={photos} setPhotos={setPhotos} onBusyChange={setUploading} min={MIN_PHOTOS} />
      </section>

      <section className="fsec">
        <h2>Details</h2>
        <label>Anything companies should know? (optional)
          <textarea name="description" maxLength={3000} placeholder="e.g. Sectional couch and an old fridge in the garage. Street parking only." />
        </label>
        <label>Job title (optional)
          <input name="title" maxLength={80} placeholder={autoTitle(items)} />
        </label>
      </section>

      <section className="fsec">
        <h2>Where &amp; when</h2>
        <div className="row">
          <label>ZIP code<input name="zip" required inputMode="numeric" maxLength={5} pattern="[0-9]{5}" defaultValue={defaultZip} autoComplete="postal-code" /></label>
          <label>City (optional)<input name="city" maxLength={60} autoComplete="address-level2" /></label>
        </div>
        <label>Pickup address
          <input name="address" required minLength={5} maxLength={200} autoComplete="street-address" placeholder="123 Main St, Apt 4" />
          <small className="mute">Private. Only the company you hire sees your address.</small>
        </label>
        <label>Gate code, parking or access notes (optional, private)
          <input name="access_notes" maxLength={500} />
        </label>
        <div className="row">
          <label>Pickup day (optional)<input name="pickup_date" type="date" min={today} /></label>
          <label>Time
            <select name="pickup_window" defaultValue="flexible">
              {WINDOWS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
            </select>
          </label>
          <label>Budget (optional)<input name="budget" type="number" min={0} step="any" inputMode="decimal" placeholder="$" /></label>
        </div>
      </section>

      {error && <div className="err" role="alert">{error}</div>}
      <button className="publish" disabled={busy}>{busy ? "Posting…" : "Post job and get quotes"}</button>
      <p className="mute" style={{ margin: 0 }}>Free. Companies near you see the job and send quotes. You choose.</p>
    </form>
  );
}
