import type { Group, Member } from "../types";

type Listener = (group: Group) => void;
type StatusListener = (status: "connecting" | "live" | "offline") => void;

export class SyncClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private code = "";
  private member: Member | null = null;
  private retry = 0;
  private timer: number | null = null;
  private closed = false;

  connect(code: string, member: Member) {
    this.closed = false;
    this.code = code;
    this.member = member;
    this.open();
  }

  disconnect() {
    this.closed = true;
    if (this.timer) window.clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: StatusListener) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  send(payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private setStatus(status: "connecting" | "live" | "offline") {
    for (const fn of this.statusListeners) fn(status);
  }

  private open() {
    this.setStatus("connecting");
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws?code=${encodeURIComponent(this.code)}`);
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.setStatus("live");
      if (this.member) this.send({ type: "hello", member: this.member });
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as { type: string; group?: Group };
        if (msg.type === "state" && msg.group) {
          for (const fn of this.listeners) fn(msg.group);
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      this.setStatus("offline");
      if (this.closed) return;
      const wait = Math.min(8000, 400 * 2 ** this.retry);
      this.retry += 1;
      this.timer = window.setTimeout(() => this.open(), wait);
    };
  }
}

export async function createGroup(name: string, member: Member): Promise<Group> {
  const res = await fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, member }),
  });
  if (!res.ok) throw new Error("Could not create a group");
  return res.json() as Promise<Group>;
}

export async function fetchGroup(code: string): Promise<Group> {
  const res = await fetch(`/api/groups/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error("That group code was not found");
  return res.json() as Promise<Group>;
}

export async function fetchIcsUrl(url: string): Promise<{ text: string; resolvedUrl: string }> {
  const res = await fetch(`/api/import?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Could not import that calendar URL");
  }
  return {
    text: await res.text(),
    resolvedUrl: res.headers.get("X-FamCal-Resolved-Url") || url,
  };
}

export async function importSpondAccount(input: {
  groupCode: string;
  memberId: string;
  email: string;
  password: string;
  sourceId?: string;
}): Promise<{ source: import("../types").Source; events: import("../types").CalEvent[] }> {
  const res = await fetch("/api/spond/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; source?: import("../types").Source; events?: import("../types").CalEvent[] };
  if (!res.ok || !body.source || !body.events) {
    throw new Error(body.error || "Could not connect Spond");
  }
  return { source: body.source, events: body.events };
}

export async function refreshSpondAccount(input: {
  groupCode: string;
  memberId: string;
  sourceId: string;
}): Promise<{ source: import("../types").Source; events: import("../types").CalEvent[] }> {
  const res = await fetch("/api/spond/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; source?: import("../types").Source; events?: import("../types").CalEvent[] };
  if (!res.ok || !body.source || !body.events) {
    throw new Error(body.error || "Could not refresh Spond");
  }
  return { source: body.source, events: body.events };
}
