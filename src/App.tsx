import { useEffect } from "react";
import { AppShell } from "./components/AppShell";
import { NotificationHost } from "./components/NotificationHost";
import { Welcome } from "./components/Welcome";
import { captureOwnerKey } from "./lib/owner";
import { useApp } from "./state/AppState";

export function App() {
  const { session } = useApp();
  useEffect(() => {
    captureOwnerKey();
  }, []);
  return (
    <div className="app-root">
      <NotificationHost />
      {session ? <AppShell /> : <Welcome />}
    </div>
  );
}
