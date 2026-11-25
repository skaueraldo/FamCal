import { useEffect } from "react";
import { AppShell } from "./components/AppShell";
import { NotificationHost } from "./components/NotificationHost";
import { SharedListView } from "./components/SharedListView";
import { Welcome } from "./components/Welcome";
import { captureOwnerKey } from "./lib/owner";
import { useApp } from "./state/AppState";

export function App() {
  const { session, shareGate } = useApp();
  useEffect(() => {
    captureOwnerKey();
  }, []);
  return (
    <div className="app-root">
      <NotificationHost />
      {shareGate !== "off" ? <SharedListView /> : session ? <AppShell /> : <Welcome />}
    </div>
  );
}
