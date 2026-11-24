// Phone cameras produce 3–8 MB photos (sometimes more). Uploading those as-is over a mobile connection takes minutes,
// so every listing/job photo is shrunk in the browser first: longest side 1600px, JPEG ~82% — typically 200–400 KB,
// still sharp on any screen. EXIF rotation is applied, so sideways phone photos come out upright.

const MAX_SIDE = 1600;
const QUALITY = 0.82;
export const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const MAX_RAW = 30 * 1024 * 1024;          // what we'll try to shrink
const MAX_UNSHRUNK = 8 * 1024 * 1024;      // what we'll upload as-is if the browser can't shrink it

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older Safari: fall back to an <img>, which also honours EXIF orientation.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function shrinkPhoto(file: File): Promise<Blob> {
  const src = await decode(file);
  const w = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h = "naturalHeight" in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff";                    // flatten PNG transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  if ("close" in src) src.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", QUALITY));
}

// The file to upload: the shrunk JPEG, or — if this browser can't decode it — the original when it's a small
// JPG/PNG/WebP. Throws a readable message otherwise.
export async function preparePhoto(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  const plain = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (!file.type.startsWith("image/") || file.size > MAX_RAW) throw new Error("Photos must be images under 30 MB.");
  try {
    const blob = await shrinkPhoto(file);
    // Already-small images can come out larger after re-encoding; keep the original then.
    if (plain && file.size <= blob.size) return { blob: file, ext: file.type.split("/")[1], type: file.type };
    return { blob, ext: "jpg", type: "image/jpeg" };
  } catch {
    if (plain && file.size <= MAX_UNSHRUNK) return { blob: file, ext: file.type.split("/")[1], type: file.type };
    throw new Error(plain ? "That photo is too large — please pick one under 8 MB." : "This browser can't read that photo format. Try a JPG or PNG.");
  }
}

// Run `fn` over items with at most `limit` in flight (a few parallel uploads are much faster than one at a time,
// without flooding a weak connection).
export async function eachLimited<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
