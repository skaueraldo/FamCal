import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ensureServiceWorker } from "./lib/notifications";
import { AppProvider } from "./state/AppState";
import "./index.css";

document.documentElement.dataset.booted = "1";

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function restorePaint() {
  const root = document.getElementById("root");
  if (!root) return;
  root.style.transform = "translateZ(0)";
  requestAnimationFrame(() => {
    root.style.transform = "";
  });
}

if (isStandaloneApp()) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") restorePaint();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) restorePaint();
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void ensureServiceWorker();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
