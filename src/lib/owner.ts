const KEY = "famcal.ownerKey";

export function captureOwnerKey(search = location.search): string {
  try {
    const params = new URLSearchParams(search);
    const incoming = String(params.get("owner") || "").trim();
    if (!incoming) return readOwnerKey();
    localStorage.setItem(KEY, incoming);
    params.delete("owner");
    const next = `${location.pathname}${params.toString() ? `?${params}` : ""}${location.hash}`;
    history.replaceState({}, "", next);
    return incoming;
  } catch {
    return readOwnerKey();
  }
}

export function readOwnerKey(): string {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}
