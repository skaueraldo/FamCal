import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer } from "ws";
import { calendarFetchUrls, GOOGLE_ICAL_HELP, looksLikeHtml, looksLikeIcs } from "./calendar-url.js";
import { fetchSpondActivities } from "./spond.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const onVercel = Boolean(process.env.VERCEL);
const dataDir = onVercel ? join("/tmp", "famcal-data") : join(root, "data");
const dataFile = join(dataDir, "groups.json");
const secretsFile = join(dataDir, "spond-secrets.json");
const PORT = Number(process.env.PORT) || 3847;

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

/** @type {Record<string, object>} */
let groups = {};
if (existsSync(dataFile)) {
  try {
    groups = JSON.parse(readFileSync(dataFile, "utf8"));
  } catch {
    groups = {};
  }
}

function persist() {
  writeFileSync(dataFile, JSON.stringify(groups, null, 2));
}

/** @type {Record<string, { email: string, password: string }>} */
let secrets = {};
if (existsSync(secretsFile)) {
  try {
    secrets = JSON.parse(readFileSync(secretsFile, "utf8"));
  } catch {
    secrets = {};
  }
}

function persistSecrets() {
  writeFileSync(secretsFile, JSON.stringify(secrets, null, 2), { mode: 0o600 });
}

function secretKey(code, sourceId) {
  return `${code}:${sourceId}`;
}

function publicGroup(group) {
  return {
    ...group,
    dinners: group.dinners || [],
    wishlists: group.wishlists || [],
    sources: (group.sources || []).map((source) => {
      const { password, token, ...safe } = source;
      return safe;
    }),
  };
}

function emptyGroup(code, name, member) {
  return {
    code,
    name,
    members: member ? [member] : [],
    events: [],
    items: [],
    dinners: [],
    wishlists: [],
    sources: [],
    updatedAt: Date.now(),
  };
}

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const rooms = new Map();

function roomOf(code) {
  if (!rooms.has(code)) rooms.set(code, new Set());
  return rooms.get(code);
}

function send(ws, payload) {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload));
}

function broadcast(code, payload, except) {
  const room = rooms.get(code);
  if (!room) return;
  const raw = JSON.stringify(payload);
  for (const client of room) {
    if (client !== except && client.readyState === 1) client.send(raw);
  }
}

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/groups", (req, res) => {
  const name = String(req.body?.name || "Family").trim().slice(0, 60);
  const member = req.body?.member;
  let code = makeCode();
  while (groups[code]) code = makeCode();
  groups[code] = emptyGroup(code, name, member);
  persist();
  res.json(publicGroup(groups[code]));
});

app.get("/api/groups/:code", (req, res) => {
  const group = groups[req.params.code.toUpperCase()];
  if (!group) return res.status(404).json({ error: "Group not found" });
  res.json(publicGroup(group));
});

app.post("/api/spond/import", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  const memberId = String(req.body?.memberId || "");
  const groupCode = String(req.body?.groupCode || "").toUpperCase();
  const sourceId = String(req.body?.sourceId || `src_${Date.now().toString(36)}`);
  if (!email || !password || !memberId || !groups[groupCode]) {
    return res.status(400).json({ error: "Missing Spond login or group" });
  }
  try {
    const { events } = await fetchSpondActivities(email, password, memberId, sourceId);
    secrets[secretKey(groupCode, sourceId)] = { email, password };
    persistSecrets();
    res.json({
      source: {
        id: sourceId,
        name: `Spond · ${email}`,
        kind: "spond",
        email,
        lastImported: Date.now(),
      },
      events,
    });
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : "Spond import failed" });
  }
});

app.post("/api/spond/refresh", async (req, res) => {
  const memberId = String(req.body?.memberId || "");
  const groupCode = String(req.body?.groupCode || "").toUpperCase();
  const sourceId = String(req.body?.sourceId || "");
  const stored = secrets[secretKey(groupCode, sourceId)];
  if (!stored || !memberId || !groups[groupCode]) {
    return res.status(404).json({ error: "Spond is not connected on this computer. Sign in again." });
  }
  try {
    const { events } = await fetchSpondActivities(stored.email, stored.password, memberId, sourceId);
    res.json({
      source: {
        id: sourceId,
        name: `Spond · ${stored.email}`,
        kind: "spond",
        email: stored.email,
        lastImported: Date.now(),
      },
      events,
    });
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : "Spond refresh failed" });
  }
});

app.get("/api/import", async (req, res) => {
  const raw = String(req.query.url || "");
  if (!raw) return res.status(400).json({ error: "Missing url" });
  let urls;
  try {
    urls = calendarFetchUrls(raw);
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }

  let lastError = "Could not fetch that calendar URL";
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/calendar, text/plain, */*",
          "User-Agent": "FamCal/1.0 (calendar import)",
        },
        redirect: "follow",
      });
      const text = await response.text();
      if (!response.ok) {
        lastError = `Calendar source returned ${response.status}`;
        continue;
      }
      if (looksLikeHtml(text) || !looksLikeIcs(text)) {
        lastError = url.includes("google.com") ? GOOGLE_ICAL_HELP : "That link did not return a calendar file.";
        continue;
      }
      if (!/BEGIN:VEVENT/i.test(text)) {
        lastError = url.includes("google.com")
          ? GOOGLE_ICAL_HELP
          : "The calendar file had no events in it.";
        continue;
      }
      res.set("Access-Control-Expose-Headers", "X-FamCal-Resolved-Url");
      res.set("X-FamCal-Resolved-Url", url);
      res.type("text/calendar").send(text);
      return;
    } catch {
      lastError = "Could not fetch that calendar URL";
    }
  }
  res.status(502).json({ error: lastError });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(root, "dist")));
  app.get(/.*/, (_req, res) => {
    res.sendFile(join(root, "dist", "index.html"));
  });
}

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", "http://localhost");
  const code = String(url.searchParams.get("code") || "").toUpperCase();
  if (!code || !groups[code]) {
    send(ws, { type: "error", error: "Group not found" });
    ws.close();
    return;
  }

  roomOf(code).add(ws);
  send(ws, { type: "state", group: publicGroup(groups[code]) });

  ws.on("message", (buf) => {
    let msg;
    try {
      msg = JSON.parse(String(buf));
    } catch {
      return;
    }
    const group = groups[code];
    if (!group) return;

    switch (msg.type) {
      case "hello": {
        if (msg.member?.id) {
          const idx = group.members.findIndex((m) => m.id === msg.member.id);
          if (idx >= 0) group.members[idx] = { ...group.members[idx], ...msg.member };
          else group.members.push(msg.member);
        }
        break;
      }
      case "group:rename":
        group.name = String(msg.name || group.name).slice(0, 60);
        break;
      case "event:upsert":
        upsert(group.events, msg.event);
        break;
      case "event:delete":
        group.events = group.events.filter((e) => e.id !== msg.id);
        break;
      case "item:upsert":
        upsert(group.items, msg.item);
        break;
      case "item:delete":
        group.items = group.items.filter((i) => i.id !== msg.id);
        break;
      case "dinner:upsert":
        if (!group.dinners) group.dinners = [];
        upsert(group.dinners, msg.dinner);
        break;
      case "dinner:delete":
        group.dinners = (group.dinners || []).filter((d) => d.id !== msg.id);
        break;
      case "wishlist:upsert":
        if (!group.wishlists) group.wishlists = [];
        upsert(group.wishlists, msg.wishlist);
        break;
      case "wishlist:delete":
        group.wishlists = (group.wishlists || []).filter((w) => w.id !== msg.id);
        break;
      case "source:upsert":
        upsert(group.sources, msg.source);
        break;
      case "source:replace":
        upsert(group.sources, msg.source);
        group.events = group.events.filter((e) => e.sourceId !== msg.source?.id);
        for (const event of msg.events || []) upsert(group.events, event);
        break;
      case "source:delete":
        group.sources = group.sources.filter((s) => s.id !== msg.id);
        group.events = group.events.filter((e) => e.sourceId !== msg.id);
        delete secrets[secretKey(code, msg.id)];
        persistSecrets();
        break;
      default:
        return;
    }

    group.updatedAt = Date.now();
    persist();
    broadcast(code, { type: "state", group: publicGroup(group) }, null);
  });

  ws.on("close", () => {
    roomOf(code).delete(ws);
  });
});

function upsert(list, item) {
  if (!item?.id) return;
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default server;

if (!onVercel) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`FamCal sync on http://127.0.0.1:${PORT}`);
  });
}
