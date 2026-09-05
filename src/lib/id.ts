export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const COLORS = ["#c45c26", "#3d6b8a", "#4a6b4e", "#a63d4a", "#8a5a2b", "#5a4f8a", "#2f6f6a"];

export function colorFor(index: number): string {
  return COLORS[index % COLORS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
