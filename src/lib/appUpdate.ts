const BUILD_ID = String(import.meta.env.VITE_BUILD_ID || "dev");
const TRIED_KEY = "famcal.updateTried";

function cleanVersionParam() {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has("_v")) return;
    url.searchParams.delete("_v");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore */
  }
}

async function remoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { id?: string };
    return typeof body.id === "string" && body.id ? body.id : null;
  } catch {
    return null;
  }
}

export async function applyAppUpdate(): Promise<void> {
  if (BUILD_ID === "dev") {
    cleanVersionParam();
    return;
  }
  const remote = await remoteBuildId();
  if (!remote || remote === BUILD_ID) {
    cleanVersionParam();
    return;
  }
  try {
    if (sessionStorage.getItem(TRIED_KEY) === remote) return;
    sessionStorage.setItem(TRIED_KEY, remote);
  } catch {
    /* still try once */
  }
  const url = new URL(location.href);
  url.searchParams.set("_v", remote);
  location.replace(url.toString());
}

export function watchAppUpdates(): void {
  void applyAppUpdate();
  const onVisible = () => {
    if (document.visibilityState === "visible") void applyAppUpdate();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", () => void applyAppUpdate());
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) void applyAppUpdate();
  });
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;
    const update = () => void reg.update();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") update();
    });
    window.setInterval(update, 10 * 60 * 1000);
  });
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type === "sw-activated") void applyAppUpdate();
  });
}
