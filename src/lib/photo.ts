const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_EDGE = 512;
const MAX_BYTES = 2 * 1024 * 1024;

export async function prepareMemberPhoto(file: File): Promise<{ blob: Blob; type: string }> {
  if (!TYPES.has(file.type)) throw new Error("Use a JPEG, PNG, WebP, or GIF photo.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Choose a photo smaller than 2 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not save that photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("Could not save that photo.");
  if (blob.size > MAX_BYTES) throw new Error("Choose a photo smaller than 2 MB.");
  return { blob, type: "image/jpeg" };
}

export function memberPhotoSrc(
  groupCode: string | undefined,
  member: { id: string; photo?: string; photoAt?: number },
): string {
  if (!groupCode || !member.photo) return "";
  return `/api/groups/${encodeURIComponent(groupCode)}/members/${encodeURIComponent(member.id)}/photo?v=${member.photoAt || 1}`;
}
