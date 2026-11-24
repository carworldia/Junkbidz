"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACCEPT, eachLimited, preparePhoto } from "@/lib/photos";

type Pending = { key: string; preview: string; state: "working" | "failed" };

// Uploads into the caller's own folder of the photos bucket (<uid>/<subfolder>/...; no subfolder = <uid>/...).
// Each photo is shrunk in the browser first (see lib/photos), three upload at a time, and each one shows up as soon as
// it's done (in the order picked) instead of after the whole batch.
export default function PhotoUploader({ userId, photos, setPhotos, max = 8, subfolder = "jobs", required = false, onBusyChange }: {
  userId: string; photos: string[]; setPhotos: React.Dispatch<React.SetStateAction<string[]>>; max?: number;
  subfolder?: string | null; required?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const busy = pending.some((p) => p.state === "working");
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const room = max - photos.length - pending.filter((p) => p.state === "working").length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (!picked.length) return;
    const items: Pending[] = picked.map((f) => ({ key: crypto.randomUUID(), preview: URL.createObjectURL(f), state: "working" }));
    setPending((p) => [...p.filter((x) => x.state === "working"), ...items]);

    const supabase = createClient();
    const results: (string | null | undefined)[] = new Array(picked.length);   // undefined = not finished yet
    let flushed = 0;
    // Hand finished photos over in the order they were picked.
    const flush = () => {
      const ready: string[] = [];
      while (flushed < results.length && results[flushed] !== undefined) {
        const url = results[flushed];
        if (url) ready.push(url);
        const key = items[flushed].key;
        if (url) { URL.revokeObjectURL(items[flushed].preview); setPending((p) => p.filter((x) => x.key !== key)); }
        flushed++;
      }
      if (ready.length) setPhotos((p) => [...p, ...ready]);
    };

    await eachLimited(picked, 3, async (file, i) => {
      try {
        const { blob, ext, type } = await preparePhoto(file);
        const path = `${userId}/${subfolder ? `${subfolder}/` : ""}${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("photos").upload(path, blob, { contentType: type, cacheControl: "31536000" });
        if (upErr) throw new Error(upErr.message);
        results[i] = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      } catch (e) {
        results[i] = null;
        const key = items[i].key;
        setPending((p) => p.map((x) => (x.key === key ? { ...x, state: "failed" } : x)));
        setError(e instanceof Error ? e.message : "Upload failed.");
      }
      flush();
    });
  }

  async function remove(url: string) {
    setPhotos((p) => p.filter((x) => x !== url));
    const marker = "/photos/";
    const i = url.indexOf(marker);
    if (i >= 0) await createClient().storage.from("photos").remove([url.slice(i + marker.length)]);
  }
  function dismiss(key: string) {
    setPending((p) => p.filter((x) => { if (x.key === key) URL.revokeObjectURL(x.preview); return x.key !== key; }));
  }

  const working = pending.filter((p) => p.state === "working").length;
  return (
    <div className="photo-up">
      <div className="mute" style={{ marginBottom: 6 }}>
        Photos ({photos.length}/{max}){required && <strong> — at least 1 required</strong>}
        {photos.length > 0 && <span> · the first photo is the cover</span>}
      </div>
      <div className="previews">
        {photos.map((p) => (
          <div key={p}><img src={p} alt="" /><button type="button" className="danger" aria-label="Remove photo" onClick={() => remove(p)}>×</button></div>
        ))}
        {pending.map((p) => (
          <div key={p.key} className={`pending ${p.state}`}>
            <img src={p.preview} alt="" />
            {p.state === "working" ? <span className="spin" aria-hidden="true" />
              : <button type="button" className="danger" aria-label="Dismiss failed photo" onClick={() => dismiss(p.key)}>×</button>}
          </div>
        ))}
      </div>
      {photos.length + working < max && (
        <label className="btn ghost add-photos">
          <input ref={input} type="file" accept={ACCEPT} multiple className="sr"
            onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
          + Add photos
        </label>
      )}
      {working > 0 && <div className="mute" role="status">Uploading {working} photo{working === 1 ? "" : "s"}…</div>}
      {error && <div className="err">{error}</div>}
    </div>
  );
}
