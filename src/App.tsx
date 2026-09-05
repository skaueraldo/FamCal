import { AppShell } from "./components/AppShell";
import { Welcome } from "./components/Welcome";
import { useApp } from "./state/AppState";

export function App() {
  const { session } = useApp();
  return <div className="app-root">{session ? <AppShell /> : <Welcome />}</div>;
}
