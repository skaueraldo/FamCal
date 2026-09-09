import { AppShell } from "./components/AppShell";
import { NotificationHost } from "./components/NotificationHost";
import { Welcome } from "./components/Welcome";
import { useApp } from "./state/AppState";

export function App() {
  const { session } = useApp();
  return (
    <div className="app-root">
      <NotificationHost />
      {session ? <AppShell /> : <Welcome />}
    </div>
  );
}
