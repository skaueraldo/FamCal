import { useState, type FormEvent } from "react";
import { useApp } from "../state/AppState";

export function Welcome() {
  const { startGroup, joinGroup, t, localizeError, language, setLanguage, error: sessionError } = useApp();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "create") await startGroup(name, groupName.trim() || t("defaultGroupName"));
      else await joinGroup(name, code);
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : t("somethingWentWrong")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="brand-mark">F</div>
        <h1>{t("welcomeTitle")}</h1>
        <p className="lede">{t("welcomeLede")}</p>
        <form onSubmit={submit}>
          <label className="field">
            <span>{t("yourName")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tobben" required />
          </label>
          {mode === "create" ? (
            <label className="field">
              <span>{t("groupName")}</span>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t("defaultGroupName")}
              />
            </label>
          ) : (
            <label className="field">
              <span>{t("inviteCode")}</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                placeholder="AB12CD"
                maxLength={6}
                required
              />
            </label>
          )}
          {error || sessionError ? <p className="error">{localizeError(error || sessionError || "")}</p> : null}
          <div className="row">
            <button className="btn" type="submit" disabled={busy}>
              {mode === "create" ? t("createSharedCalendar") : t("joinGroup")}
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() => setMode(mode === "create" ? "join" : "create")}
            >
              {mode === "create" ? t("iHaveACode") : t("createANewGroup")}
            </button>
          </div>
        </form>
        <div className="welcome-langs" role="group" aria-label={t("language")}>
          <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>
            English
          </button>
          <button type="button" className={language === "no" ? "active" : ""} onClick={() => setLanguage("no")}>
            Norsk
          </button>
        </div>
      </div>
    </div>
  );
}
