import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export function createFileStore(dataDir, dataFile) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  function read() {
    if (!existsSync(dataFile)) return {};
    try {
      return JSON.parse(readFileSync(dataFile, "utf8"));
    } catch {
      return {};
    }
  }

  function write(groups) {
    writeFileSync(dataFile, JSON.stringify(groups, null, 2));
  }

  return { read, write };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function sanitizeGroup(raw) {
  if (!raw || typeof raw !== "object") return null;
  const code = String(raw.code || "")
    .trim()
    .toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return null;
  return {
    code,
    name: String(raw.name || "Family").trim().slice(0, 60) || "Family",
    members: asArray(raw.members).filter((member) => member && member.id),
    events: asArray(raw.events).filter((event) => event && event.id),
    items: asArray(raw.items).filter((item) => item && item.id),
    dinners: asArray(raw.dinners).filter((dinner) => dinner && dinner.id),
    wishlists: asArray(raw.wishlists).filter((list) => list && list.id),
    sources: asArray(raw.sources)
      .filter((source) => source && source.id)
      .map(({ password, token, ...source }) => source),
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}
