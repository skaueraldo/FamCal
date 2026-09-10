import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { get, put } from "@vercel/blob";

export function createFileStore(dataDir, dataFile) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  return {
    async read() {
      if (!existsSync(dataFile)) return {};
      try {
        const parsed = JSON.parse(readFileSync(dataFile, "utf8"));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    },
    async write(groups) {
      if (!groups || typeof groups !== "object") return;
      if (!Object.keys(groups).length && existsSync(dataFile)) {
        try {
          const existing = JSON.parse(readFileSync(dataFile, "utf8"));
          if (existing && typeof existing === "object" && Object.keys(existing).length) return;
        } catch {
          return;
        }
      }
      writeFileSync(dataFile, JSON.stringify(groups, null, 2));
    },
  };
}

export function mergeGroups(left = {}, right = {}) {
  const codes = new Set([...Object.keys(left), ...Object.keys(right)]);
  const out = {};
  for (const code of codes) {
    const a = left[code];
    const b = right[code];
    if (!a) out[code] = b;
    else if (!b) out[code] = a;
    else out[code] = Number(a.updatedAt) >= Number(b.updatedAt || 0) ? a : b;
  }
  return out;
}

export function createDurableStore(fileStore) {
  const pathname = "famcal/groups.json";
  return {
    async read() {
      const disk = await fileStore.read();
      try {
        const result = await get(pathname, { access: "private", useCache: false });
        if (!result || result.statusCode === 404 || !result.stream) return disk;
        const text = await new Response(result.stream).text();
        if (!text.trim()) return disk;
        const stored = JSON.parse(text);
        if (!stored || typeof stored !== "object" || Array.isArray(stored)) return disk;
        return mergeGroups(disk, stored);
      } catch {
        return disk;
      }
    },
    async write(groups) {
      if (!groups || typeof groups !== "object") return;
      if (!Object.keys(groups).length) {
        const existing = await this.read();
        if (Object.keys(existing).length) return;
      }
      await fileStore.write(groups);
      try {
        await put(pathname, JSON.stringify(groups), {
          access: "private",
          allowOverwrite: true,
          addRandomSuffix: false,
          contentType: "application/json",
        });
      } catch (error) {
        console.error("FamCal could not persist groups to Blob:", error instanceof Error ? error.message : error);
      }
    },
  };
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
