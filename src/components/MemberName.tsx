import { memberColorOf } from "../lib/events";
import type { Member } from "../types";
import { Avatar } from "./Avatar";

export function memberById(
  members: Member[] | undefined,
  id: string | undefined,
  fallbackName = "",
): { id: string; name: string; color: string; photo?: string; photoAt?: number } {
  const found = members?.find((member) => member.id === id);
  if (found) return found;
  return {
    id: id || "unknown",
    name: fallbackName || "?",
    color: memberColorOf(members, id || ""),
  };
}

export function MemberName({
  member,
  memberId,
  members,
  groupCode,
  fallbackName,
  prefix,
}: {
  member?: { id: string; name: string; color: string; photo?: string; photoAt?: number };
  memberId?: string;
  members?: Member[];
  groupCode?: string;
  fallbackName?: string;
  prefix?: string;
}) {
  const resolved = member ?? memberById(members, memberId, fallbackName);
  return (
    <span className="member-name">
      {prefix ? <span>{prefix}</span> : null}
      <Avatar member={resolved} groupCode={groupCode} size="sm" />
      <span>{resolved.name}</span>
    </span>
  );
}
