import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { get, put } from "@vercel/blob";
import { parsePhotoExt } from "./photos.js";

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

const MENU_SECTIONS = ["calendar", "dinner", "shopping", "todos", "spendings", "wishlist", "group"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function parseMemberMenu(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const menu = {};
  let seen = false;
  for (const section of MENU_SECTIONS) {
    if (Object.prototype.hasOwnProperty.call(raw, section)) {
      menu[section] = raw[section] === true;
      seen = true;
    }
  }
  return seen ? menu : undefined;
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
    const photo = parsePhotoExt(primary?.photo);
    const photoAt = Number(primary?.photoAt);
    const merged = {
      ...secondary,
      ...primary,
      id,
      admin: Boolean(a?.admin || b?.admin),
    };
    if (photo) {
      merged.photo = photo;
      merged.photoAt = Number.isFinite(photoAt) && photoAt > 0 ? photoAt : Date.now();
    } else {
      delete merged.photo;
      delete merged.photoAt;
    }
    const color = nextFreeMemberColor(used, primary?.color || secondary?.color);
    used.push(color);
    return { ...merged, color };
  });
}

const EARLIEST_CREATED_AT = Date.UTC(2024, 0, 1);

function isPlausibleCreatedAt(value) {
  const stamp = Number(value);
  return Number.isFinite(stamp) && stamp >= EARLIEST_CREATED_AT && stamp <= Date.now() + 86_400_000;
}

export function groupCreatedAt(group) {
  if (!group || typeof group !== "object") return Date.now();
  if (isPlausibleCreatedAt(group.createdAt)) return Number(group.createdAt);
  const times = [];
  const push = (value) => {
    if (isPlausibleCreatedAt(value)) times.push(Number(value));
  };
  push(group.updatedAt);
  for (const item of asArray(group.items)) push(item?.createdAt);
  for (const list of [...asArray(group.wishlists), ...asArray(group.todos), ...asArray(group.spendings)]) {
    push(list?.createdAt);
    for (const item of asArray(list?.items)) push(item?.createdAt);
  }
  for (const entry of asArray(group.shopHistory)) push(entry?.lastUsed);
  return times.length ? Math.min(...times) : Date.now();
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
    createdAt: Math.min(groupCreatedAt(left), groupCreatedAt(right)),
    updatedAt: Math.max(Number(left.updatedAt) || 0, Number(right.updatedAt) || 0),
  };
  for (const key of ["events", "items", "dinners", "favorites", "wishlists", "todos", "spendings", "sources", "shopHistory", "shopArchives"]) {
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

function sanitizeEvent(event) {
  if (!event || !event.id) return null;
  const seen = new Set();
  const dates = (Array.isArray(event.dates) ? event.dates : [])
    .map((value) => String(value || "").slice(0, 10))
    .filter((iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso))
    .filter((iso) => {
      if (seen.has(iso)) return false;
      seen.add(iso);
      return true;
    })
    .sort()
    .slice(0, 62);
  const next = { ...event };
  if (dates.length > 1) next.dates = dates;
  else delete next.dates;
  return next;
}

const FOOD_CATEGORIES = new Set(["produce", "dairy", "meat", "fish", "bakery", "pantry", "frozen", "other"]);

function sanitizeShopItem(item) {
  if (!item || !item.id || !String(item.name || "").trim()) return null;
  const category = FOOD_CATEGORIES.has(item.category) ? item.category : undefined;
  const qty = item.qty ? String(item.qty).trim().slice(0, 40) : undefined;
  return {
    id: String(item.id),
    name: String(item.name).trim().slice(0, 80),
    ...(qty ? { qty } : {}),
    ...(category ? { category } : {}),
    done: Boolean(item.done),
    memberId: String(item.memberId || ""),
    createdAt: Number(item.createdAt) || Date.now(),
  };
}

export function sanitizeShopArchive(raw) {
  if (!raw || !raw.id) return null;
  const items = asArray(raw.items).map(sanitizeShopItem).filter(Boolean);
  if (!items.length) return null;
  const name = String(raw.name || "").trim().slice(0, 80);
  return {
    id: String(raw.id),
    name: name || "List",
    memberId: String(raw.memberId || ""),
    createdAt: Number(raw.createdAt) || Date.now(),
    items,
  };
}

function sanitizeFavorite(raw) {
  if (!raw || !raw.id || !String(raw.title || "").trim()) return null;
  return {
    id: String(raw.id),
    title: String(raw.title).trim().slice(0, 80),
    notes: raw.notes ? String(raw.notes).trim().slice(0, 200) : undefined,
    memberId: String(raw.memberId || ""),
    createdAt: Number(raw.createdAt) || Date.now(),
    ingredients: asArray(raw.ingredients)
      .map((item) => {
        const name = String(item?.name || "").trim().slice(0, 80);
        if (!name) return null;
        const category = FOOD_CATEGORIES.has(item.category) ? item.category : "other";
        const qty = item.qty ? String(item.qty).trim().slice(0, 40) : undefined;
        return { name, category, ...(qty ? { qty } : {}) };
      })
      .filter(Boolean),
  };
}

function sanitizeNamedList(list) {
  if (!list || !list.id) return null;
  const folder = String(list.folder || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
  const archivedAt = Number(list.archivedAt);
  const next = { ...list };
  if (folder) next.folder = folder;
  else delete next.folder;
  if (Number.isFinite(archivedAt) && archivedAt > 0) next.archivedAt = archivedAt;
  else delete next.archivedAt;
  return next;
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
      .map((member) => {
        const menu = parseMemberMenu(member.menu);
        const photo = parsePhotoExt(member.photo);
        const photoAt = Number(member.photoAt);
        return {
          id: String(member.id),
          name: String(member.name || "").slice(0, 60),
          color: String(member.color || "#1e88e5"),
          admin: Boolean(member.admin),
          ...(photo ? { photo, photoAt: Number.isFinite(photoAt) && photoAt > 0 ? photoAt : Date.now() } : {}),
          ...(menu ? { menu } : {}),
        };
      }),
    kickedIds: asArray(raw.kickedIds).map(String).filter(Boolean),
    events: asArray(raw.events).map(sanitizeEvent).filter(Boolean),
    items: asArray(raw.items).filter((item) => item && item.id),
    shopArchives: asArray(raw.shopArchives).map(sanitizeShopArchive).filter(Boolean).slice(0, 40),
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
    favorites: asArray(raw.favorites).map(sanitizeFavorite).filter(Boolean),
    wishlists: asArray(raw.wishlists).map(sanitizeNamedList).filter(Boolean),
    todos: asArray(raw.todos).map(sanitizeNamedList).filter(Boolean),
    spendings: asArray(raw.spendings).map(sanitizeNamedList).filter(Boolean),
    sources: asArray(raw.sources)
      .filter((source) => source && source.id)
      .map(({ password, token, ...source }) => source),
    createdAt: groupCreatedAt(raw),
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
