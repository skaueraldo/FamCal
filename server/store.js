import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { get, put } from "@vercel/blob";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseGroups(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

export function mergeMembers(left, right, kickedIds = []) {
  const kicked = new Set(asArray(kickedIds).map(String));
  const byId = new Map();
  for (const member of [...asArray(left), ...asArray(right)]) {
    if (!member?.id) continue;
    const id = String(member.id);
    if (kicked.has(id)) continue;
    const previous = byId.get(id);
    byId.set(
      id,
      previous
        ? { ...previous, ...member, id, admin: Boolean(previous.admin || member.admin) }
        : { ...member, id, admin: Boolean(member.admin) },
    );
  }
  return [...byId.values()];
}

export function mergeGroupState(left, right, options = {}) {
  if (!left) return right;
  if (!right) return left;
  const rightNewer = Number(right.updatedAt) >= Number(left.updatedAt || 0);
  const newer = rightNewer ? right : left;
  const older = rightNewer ? left : right;
  const kickedIds = [...new Set([...asArray(left.kickedIds), ...asArray(right.kickedIds)].map(String).filter(Boolean))];
  const merged = {
    ...older,
    ...newer,
    code: newer.code || older.code,
    name: String(newer.name || older.name || "Family"),
    kickedIds,
    members: mergeMembers(left.members, right.members, kickedIds),
    updatedAt: Math.max(Number(left.updatedAt) || 0, Number(right.updatedAt) || 0),
  };
  for (const key of ["events", "items", "dinners", "wishlists", "todos", "spendings", "sources", "shopHistory"]) {
    const chosen = asArray(newer[key]);
    const fallback = asArray(older[key]);
    merged[key] = options.preserveRicherCollections && chosen.length === 0 && fallback.length > 0 ? fallback : chosen;
  }
  return ensureGroupRoles(merged);
}

export function mergeGroups(left = {}, right = {}, options = {}) {
  const codes = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
  const out = {};
  for (const code of codes) {
    out[code] = mergeGroupState(left?.[code], right?.[code], options);
  }
  return out;
}

export function createFileStore(dataDir, dataFile) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  return {
    async read() {
      if (!existsSync(dataFile)) return {};
      try {
        return parseGroups(JSON.parse(readFileSync(dataFile, "utf8")));
      } catch {
        return {};
      }
    },
    async write(groups) {
      if (!groups || typeof groups !== "object") return;
      const existing = await this.read();
      const merged = mergeGroups(existing, groups);
      if (!Object.keys(merged).length && Object.keys(existing).length) return;
      writeFileSync(dataFile, JSON.stringify(merged, null, 2));
    },
  };
}

async function readBlob(pathname) {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode === 404 || !result.stream) return {};
  const text = await new Response(result.stream).text();
  if (!text.trim()) return {};
  return parseGroups(JSON.parse(text));
}

export function createDurableStore(fileStore) {
  const pathname = "famcal/groups.json";
  return {
    async read() {
      const disk = await fileStore.read();
      try {
        return mergeGroups(disk, await readBlob(pathname));
      } catch {
        return disk;
      }
    },
    async write(groups) {
      if (!groups || typeof groups !== "object") return;
      const disk = await fileStore.read();
      let blob = {};
      let blobReady = false;
      try {
        blob = await readBlob(pathname);
        blobReady = true;
      } catch (error) {
        console.error(
          "FamCal could not read groups from Blob; leaving stored groups unchanged:",
          error instanceof Error ? error.message : error,
        );
      }
      const merged = mergeGroups(mergeGroups(disk, blob), groups);
      if (!Object.keys(merged).length && (Object.keys(disk).length || Object.keys(blob).length)) return;
      await fileStore.write(merged);
      if (!blobReady) return;
      try {
        await put(pathname, JSON.stringify(merged), {
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
    shopHistory: (() => {
      const saved = asArray(raw.shopHistory)
        .filter((entry) => entry && entry.name)
        .map((entry) => ({
          name: String(entry.name).slice(0, 80),
          qty: entry.qty ? String(entry.qty).slice(0, 40) : undefined,
          lastUsed: Number(entry.lastUsed) || Date.now(),
          uses: Number(entry.uses) || 1,
        }));
      if (saved.length) return saved;
      return asArray(raw.items)
        .filter((item) => item && item.name)
        .map((item) => ({
          name: String(item.name).slice(0, 80),
          qty: item.qty ? String(item.qty).slice(0, 40) : undefined,
          lastUsed: Number(item.createdAt) || Date.now(),
          uses: 1,
        }));
    })(),
    dinners: asArray(raw.dinners).filter((dinner) => dinner && dinner.id),
    wishlists: asArray(raw.wishlists).filter((list) => list && list.id),
    todos: asArray(raw.todos).filter((list) => list && list.id),
    spendings: asArray(raw.spendings).filter((list) => list && list.id),
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
