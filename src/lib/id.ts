export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

import { EVENT_COLORS, nextFreeMemberColor } from "./events";

export function colorFor(index: number): string {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

export function freeMemberColor(members: { color?: string }[], keep = ""): string {
  return nextFreeMemberColor(members.map((member) => member.color || ""), keep);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
