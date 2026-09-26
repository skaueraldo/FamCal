import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { del, get, put } from "@vercel/blob";

export const PHOTO_TYPES = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const PHOTO_EXTS = new Set(Object.values(PHOTO_TYPES));
const MAX_BYTES = 2 * 1024 * 1024;

export function parsePhotoExt(value) {
  const ext = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\./, "");
  return PHOTO_EXTS.has(ext) ? ext : "";
}

export function photoContentType(value) {
  const type = String(value || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  return PHOTO_TYPES[type] ? type : "";
}

function safePart(value) {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
}

function blobPath(code, memberId, ext) {
  return `famcal/avatars/${safePart(code)}/${safePart(memberId)}.${ext}`;
}

function diskDir(dataDir, code) {
  return join(dataDir, "avatars", safePart(code));
}

function diskPath(dataDir, code, memberId, ext) {
  return join(diskDir(dataDir, code), `${safePart(memberId)}.${ext}`);
}

async function removeStored(onVercel, dataDir, code, memberId) {
  const id = safePart(memberId);
  if (!id) return;
  if (onVercel) {
    await Promise.all(
      [...PHOTO_EXTS].map(async (ext) => {
        try {
          await del(blobPath(code, memberId, ext));
        } catch {
          /* missing is fine */
        }
      }),
    );
    return;
  }
  const folder = diskDir(dataDir, code);
  if (!existsSync(folder)) return;
  for (const name of readdirSync(folder)) {
    if (name.startsWith(`${id}.`)) unlinkSync(join(folder, name));
  }
}

export async function saveMemberPhoto({ onVercel, dataDir, code, memberId, buffer, contentType }) {
  const type = photoContentType(contentType);
  const ext = PHOTO_TYPES[type];
  if (!ext) {
    const error = new Error("Use a JPEG, PNG, WebP, or GIF photo.");
    error.status = 400;
    throw error;
  }
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    const error = new Error("Use a JPEG, PNG, WebP, or GIF photo.");
    error.status = 400;
    throw error;
  }
  if (buffer.length > MAX_BYTES) {
    const error = new Error("Choose a photo smaller than 2 MB.");
    error.status = 400;
    throw error;
  }
  await removeStored(onVercel, dataDir, code, memberId);
  if (onVercel) {
    await put(blobPath(code, memberId, ext), buffer, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: type,
    });
  } else {
    mkdirSync(diskDir(dataDir, code), { recursive: true });
    writeFileSync(diskPath(dataDir, code, memberId, ext), buffer);
  }
  return ext;
}

export async function readMemberPhoto({ onVercel, dataDir, code, memberId, ext }) {
  const kind = parsePhotoExt(ext);
  if (!kind) return null;
  if (onVercel) {
    const result = await get(blobPath(code, memberId, kind), { access: "private", useCache: false });
    if (!result || result.statusCode === 404 || !result.stream) return null;
    const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
    return { bytes, type: result.blob?.contentType || Object.entries(PHOTO_TYPES).find(([, value]) => value === kind)?.[0] || "image/jpeg" };
  }
  const file = diskPath(dataDir, code, memberId, kind);
  if (!existsSync(file)) return null;
  const type = Object.entries(PHOTO_TYPES).find(([, value]) => value === kind)?.[0] || "image/jpeg";
  return { bytes: readFileSync(file), type };
}

export async function deleteMemberPhoto({ onVercel, dataDir, code, memberId }) {
  await removeStored(onVercel, dataDir, code, memberId);
}
