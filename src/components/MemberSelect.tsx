import type { Member } from "../types";
import { useApp } from "../state/AppState";
import { Avatar } from "./Avatar";
import { memberById } from "./MemberName";

export function MemberSelect({
  value,
  onChange,
  members,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  members: Member[];
  label: string;
}) {
  const { group } = useApp();
  const selected = memberById(members, value, members.find((member) => member.id === value)?.name);
  return (
    <div className="member-select">
      <Avatar member={selected} groupCode={group?.code} size="sm" />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </div>
  );
}
