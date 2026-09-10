import { useState, type FormEvent } from "react";
import { useApp } from "../state/AppState";

type Mode = "create" | "join";

export function GroupAccessForm({
  defaultName = "",
  defaultMode = "join",
  onCancel,
}: {
  defaultName?: string;
  defaultMode?: Mode;
  onCancel?: () => void;
}) {
  const { startGroup, joinGroup, t, localizeError } = useApp();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [name, setName] = useState(defaultName);
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
      onCancel?.();
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : t("somethingWentWrong")));
    } finally {
      setBusy(false);
    }
  };

  return (
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
        <>
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
          <p className="hint">{t("sameNameHint")}</p>
        </>
      )}
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <button className="btn" type="submit" disabled={busy}>
          {mode === "create" ? t("createSharedCalendar") : t("joinOrSignIn")}
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => setMode(mode === "create" ? "join" : "create")}
        >
          {mode === "create" ? t("iHaveACode") : t("createANewGroup")}
        </button>
        {onCancel ? (
          <button className="btn secondary" type="button" onClick={onCancel}>
            {t("cancelAddGroup")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
