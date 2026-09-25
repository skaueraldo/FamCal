import type { Group, Member, Profile } from "../types";

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function inviteCodeFromSearch(search = typeof location !== "undefined" ? location.search : ""): string {
  try {
    return normalizeCode(new URLSearchParams(search).get("code") || "");
  } catch {
    return "";
  }
}

export function inviteAppLink(code: string): string {
  const origin = typeof location !== "undefined" && location.origin ? location.origin : "";
  const url = new URL(origin || "https://famcal-lilac.vercel.app");
  const cleaned = normalizeCode(code);
  if (cleaned) url.searchParams.set("code", cleaned);
  return url.toString();
}

export function isInviteEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function namesMatch(left: string, right: string): boolean {
  const a = normalizeName(left);
  const b = normalizeName(right);
  return Boolean(a) && a === b;
}

export function memberByName(group: Group, name: string): Member | undefined {
  const kicked = new Set(group.kickedIds ?? []);
  return group.members.find((member) => namesMatch(member.name, name) && !kicked.has(member.id));
}

export function profileFromMember(member: Member): Profile {
  return { id: member.id, name: member.name, color: member.color };
}

export function reconcileProfile(profile: Profile, group: Group): Profile {
  const kicked = new Set(group.kickedIds ?? []);
  const byId = group.members.find((member) => member.id === profile.id && !kicked.has(member.id));
  if (byId) return profileFromMember(byId);
  const byName = memberByName(group, profile.name);
  if (byName) return profileFromMember(byName);
  return profile;
}
