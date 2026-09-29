export function listFolder(raw: unknown): string {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

export function withFolder<T extends { folder?: string }>(list: T, raw: string): T {
  const folder = listFolder(raw);
  if (!folder) {
    if (!list.folder) return list;
    const next = { ...list };
    delete next.folder;
    return next;
  }
  if (list.folder === folder) return list;
  return { ...list, folder };
}

export function isArchived(list: { archivedAt?: number }): boolean {
  return Number(list.archivedAt) > 0;
}

export function withArchived<T extends { archivedAt?: number }>(list: T, archived: boolean): T {
  if (archived) {
    if (list.archivedAt) return list;
    return { ...list, archivedAt: Date.now() };
  }
  if (!list.archivedAt) return list;
  const next = { ...list };
  delete next.archivedAt;
  return next;
}

export function splitArchived<T extends { archivedAt?: number }>(lists: T[]): { active: T[]; archived: T[] } {
  const active: T[] = [];
  const archived: T[] = [];
  for (const list of lists) {
    if (isArchived(list)) archived.push(list);
    else active.push(list);
  }
  archived.sort((left, right) => Number(right.archivedAt) - Number(left.archivedAt));
  return { active, archived };
}

export function uniqueFolders(lists: { folder?: string }[]): string[] {
  const seen = new Map<string, string>();
  for (const list of lists) {
    const name = listFolder(list.folder);
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

export function clusterLists<T extends { folder?: string; createdAt: number }>(lists: T[]): { folder: string; lists: T[] }[] {
  const grouped = new Map<string, { folder: string; lists: T[] }>();
  const ungrouped: T[] = [];
  for (const list of lists) {
    const name = listFolder(list.folder);
    if (!name) {
      ungrouped.push(list);
      continue;
    }
    const key = name.toLowerCase();
    const current = grouped.get(key) ?? { folder: name, lists: [] };
    current.lists.push(list);
    grouped.set(key, current);
  }
  const clusters = [...grouped.values()].sort((left, right) => left.folder.localeCompare(right.folder, undefined, { sensitivity: "base" }));
  for (const cluster of clusters) {
    cluster.lists.sort((left, right) => right.createdAt - left.createdAt);
  }
  ungrouped.sort((left, right) => right.createdAt - left.createdAt);
  if (!clusters.length) return [{ folder: "", lists: ungrouped }];
  return ungrouped.length ? [{ folder: "", lists: ungrouped }, ...clusters] : clusters;
}

export function partitionClusters<T extends { folder?: string; createdAt: number }>(
  lists: T[],
): { folders: { folder: string; lists: T[] }[]; standalone: T[] } {
  const clustered = clusterLists(lists);
  return {
    folders: clustered.filter((cluster) => cluster.folder),
    standalone: clustered.find((cluster) => !cluster.folder)?.lists ?? [],
  };
}
