"use client";
import { useEffect, useRef, useState } from "react";
import { colorOf, initialsOf, isAvatarUrl } from "@/lib/avatar";

// One fixed size everywhere (40px, circular), like a messaging app. `lg` is for upload previews.
// Shows the photo if there is a valid one; otherwise — or if the image fails to load — an initials
// circle. Decorative: the name is always rendered next to it, so it is hidden from screen readers.
export default function Avatar({ url, name, lg = false }: { url?: string | null; name?: string | null; lg?: boolean }) {
  const cls = `avatar${lg ? " lg" : ""}`;
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => { setFailed(false); }, [url]);
  // An error can fire before React attaches onError (server-rendered <img>), so also check after mount.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [url]);

  if (isAvatarUrl(url) && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={img} className={cls} src={url} alt="" aria-hidden="true" loading="lazy" decoding="async"
      width={lg ? 80 : 40} height={lg ? 80 : 40} onError={() => setFailed(true)} />;
  }
  return <span className={cls} aria-hidden="true" style={{ background: colorOf(name) }}>{initialsOf(name)}</span>;
}
