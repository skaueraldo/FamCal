import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { get, put } from "@vercel/blob";

const MEMBER_COLORS = ["#e53935", "#fb8c00", "#43a047", "#1e88e5", "#8e24aa", "#d81b60", "#00897b", "#6d4c41", "#3949ab", "#00acc1"];

const COLOR_UPGRADES = {
  "#8a9bb0": "#1e88e5",
  "#7d9b88": "#43a047",
  "#c4a4b0": "#d81b60",
  "#a8b8c8": "#3949ab",
  "#d4b4a0": "#fb8c00",
  "#9aa8c4": "#00acc1",
  "#b8a7d4": "#8e24aa",
  "#7eb8b0": "#00897b",
  "#d4a5a5": "#e53935",
  "#c9b8a0": "#6d4c41",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeColor(color) {
  const value = String(color || "").trim();
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : "";
  return COLOR_UPGRADES[hex] || hex;
}

export function nextFreeMemberColor(used, keep = "") {
  const taken = new Set([...used].map(normalizeColor).filter(Boolean));
  const kept = normalizeColor(keep);
  if (kept && MEMBER_COLORS.includes(kept) && !taken.has(kept)) return kept;
  return MEMBER_COLORS.find((color) => !taken.has(color)) ?? MEMBER_COLORS[0];
}

export function isColorTaken(members, color, exceptId = "") {
  const wanted = normalizeColor(color);
  if (!wanted) return true;
  return asArray(members).some((member) => member?.id !== exceptId && normalizeColor(member?.color) === wanted);
}

function parseGroups(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

export function mergeMembers(left, right, kickedIds = [], preferRight = false) {
  const kicked = new Set(asArray(kickedIds).map(String));
  const fromLeft = new Map();
  const fromRight = new Map();
  for (const member of asArray(left)) {
    if (!member?.id) continue;
    const id = String(member.id);
    if (kicked.has(id)) continue;
    fromLeft.set(id, { ...member, id, admin: Boolean(member.admin) });
  }
  for (const member of asArray(right)) {
    if (!member?.id) continue;
    const id = String(member.id);
    if (kicked.has(id)) continue;
    fromRight.set(id, { ...member, id, admin: Boolean(member.admin) });
  }
  const used = [];
  return [...new Set([...fromLeft.keys(), ...fromRight.keys()])].map((id) => {
    const a = fromLeft.get(id);
    const b = fromRight.get(id);
    const primary = preferRight ? b || a : a || b;
    const secondary = preferRight ? a : b;
    const merged = {
      ...secondary,
      ...primary,
      id,
      admin: Boolean(a?.admin || b?.admin),
    };
    const color = nextFreeMemberColor(used, primary?.color || secondary?.color);
    used.push(color);
    return { ...merged, color };
  });
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
    members: mergeMembers(left.members, right.members, kickedIds, rightNewer),
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
        color: String(member.color || "#1e88e5"),
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
  const used = [];
  group.members = asArray(group.members)
    .filter((member) => member && member.id && !kicked.has(String(member.id)))
    .map((member) => {
      const color = nextFreeMemberColor(used, member.color);
      used.push(color);
      return { ...member, admin: Boolean(member.admin), color };
    });
  if (group.members.length && !group.members.some((member) => member.admin)) {
    group.members[0].admin = true;
  }
  return group;
}
