import { initials } from "../lib/id";
import { memberPhotoSrc } from "../lib/photo";

export function Avatar({
  member,
  groupCode,
  label,
  size = "md",
}: {
  member: { id: string; name: string; color: string; photo?: string; photoAt?: number };
  groupCode?: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const src = memberPhotoSrc(groupCode, member);
  return (
    <span
      className={`avatar avatar-${size}${src ? " has-photo" : ""}`}
      style={{ background: member.color, ["--avatar-color" as string]: member.color }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    >
      {src ? <img src={src} alt="" /> : initials(member.name)}
    </span>
  );
}
