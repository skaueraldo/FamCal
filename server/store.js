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
  return ensureGroupRoles({
    code,
    name: String(raw.name || "Family").trim().slice(0, 60) || "Family",
    members: asArray(raw.members)
      .filter((member) => member && member.id)
      .map((member) => ({
        id: String(member.id),
        name: String(member.name || "").slice(0, 60),
        color: String(member.color || "#c45c26"),
        admin: Boolean(member.admin),
      })),
    kickedIds: asArray(raw.kickedIds).map(String).filter(Boolean),
    events: asArray(raw.events).filter((event) => event && event.id),
    items: asArray(raw.items).filter((item) => item && item.id),
    dinners: asArray(raw.dinners).filter((dinner) => dinner && dinner.id),
    wishlists: asArray(raw.wishlists).filter((list) => list && list.id),
    sources: asArray(raw.sources)
      .filter((source) => source && source.id)
      .map(({ password, token, ...source }) => source),
    updatedAt: Number(raw.updatedAt) || Date.now(),
  });
}

export function ensureGroupRoles(group) {
  if (!group) return group;
  const kicked = new Set(asArray(group.kickedIds).map(String));
  group.kickedIds = [...kicked];
  group.members = asArray(group.members)
    .filter((member) => member && member.id && !kicked.has(String(member.id)))
    .map((member) => ({
      ...member,
      admin: Boolean(member.admin),
    }));
  if (group.members.length && !group.members.some((member) => member.admin)) {
    group.members[0].admin = true;
  }
  return group;
}
