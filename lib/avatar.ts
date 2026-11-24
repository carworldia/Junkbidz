// Only images from this project's public photo bucket are ever rendered as avatars
// (the database enforces the same rule; this is the render-time backstop).
export const AVATAR_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/photos/`;
export const isAvatarUrl = (u?: string | null): u is string => !!u && !!process.env.NEXT_PUBLIC_SUPABASE_URL && u.startsWith(AVATAR_PREFIX);

// "Rose City Tires" → "RC", "portlandpicasso@yahoo.com" → "PO", "Member 3F9A" → "M3"
export function initialsOf(name?: string | null): string {
  const base = (name ?? "").trim();
  if (!base) return "?";
  const local = base.includes("@") ? base.split("@")[0] : base;
  const words = local.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}

// Deterministic colour per name so a person's placeholder is stable everywhere.
export const PALETTE = ["#2f5fd0", "#6b46c1", "#b83280", "#b45309", "#1b7f5c", "#0f766e"];   // white text ≥ 4.5:1
export function colorOf(name?: string | null): string {
  let h = 0;
  for (const ch of name ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// Center-crop to a square and downscale to 256×256 JPEG, so every avatar is small and consistent
// no matter what the phone camera produced.
export async function resizeAvatar(file: File, size = 256): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images.");
  ctx.fillStyle = "#fff";                     // flatten transparency
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process that image."))), "image/jpeg", 0.85));
}
