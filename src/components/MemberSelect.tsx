import type { Member } from "../types";

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
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          {member.name}
        </option>
      ))}
    </select>
  );
}
