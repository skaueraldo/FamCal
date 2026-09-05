import { Copy, RefreshCw, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { formatWhen } from "../lib/dates";
import { initials } from "../lib/id";
import { useApp } from "../state/AppState";

export function GroupView() {
  const {
    group,
    session,
    status,
    error,
    renameGroup,
    leaveGroup,
    importIcsText,
    importIcsUrl,
    importSpond,
    deleteSource,
    refreshSource,
    language,
    t,
    localizeError,
  } = useApp();
  const [groupName, setGroupName] = useState(group?.name ?? "");
  const [url, setUrl] = useState("");
  const [spondEmail, setSpondEmail] = useState("");
  const [spondPassword, setSpondPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [spondBusy, setSpondBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const importedMessage = (count: number) =>
    count === 0
      ? t("importedNoEvents")
      : count === 1
        ? t("importedCountOne", { count })
        : t("importedCountMany", { count });

  const onFile = async (file: File) => {
    const raw = await file.text();
    setMessage(importedMessage(importIcsText(raw, file.name)));
  };

  const onUrl = async (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const count = await importIcsUrl(url.trim());
      setUrl("");
      setMessage(importedMessage(count));
    } catch (err) {
      setMessage(localizeError(err instanceof Error ? err.message : t("importFailed")));
    } finally {
      setBusy(false);
    }
  };

  const onSpond = async (event: FormEvent) => {
    event.preventDefault();
    if (!spondEmail.trim() || !spondPassword) return;
    setSpondBusy(true);
    setMessage(null);
    try {
      const count = await importSpond(spondEmail.trim(), spondPassword);
      setSpondPassword("");
      setMessage(
        count === 0
          ? t("spondNone")
          : count === 1
            ? t("spondPulledOne", { count })
            : t("spondPulledMany", { count }),
      );
    } catch (err) {
      setMessage(localizeError(err instanceof Error ? err.message : t("spondLoginFailed")));
    } finally {
      setSpondBusy(false);
    }
  };

  const onRefresh = async (source: Parameters<typeof refreshSource>[0]) => {
    setMessage(null);
    try {
      const count = await refreshSource(source);
      setMessage(`${t("updatedSource", { name: source.name })} ${importedMessage(count)}`);
    } catch (err) {
      setMessage(localizeError(err instanceof Error ? err.message : t("refreshFailed")));
    }
  };

  const copyCode = async () => {
    if (!group) return;
    await navigator.clipboard.writeText(group.code);
    setMessage(t("inviteCopied"));
  };

  const statusLabel =
    status === "live" ? t("liveSync") : status === "connecting" ? t("connecting") : t("workingOffline");

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">
            <span className={`dot ${status}`} />
            {statusLabel}
          </div>
          <h1>{t("peopleAndSources")}</h1>
        </div>
      </div>

      <div className="card">
        <h2>{group?.name}</h2>
        <p className="lede" style={{ marginTop: 8 }}>
          {t("shareCodeLede")}
        </p>
        <div className="row">
          <span className="code-pill">{group?.code}</span>
          <button className="btn secondary" onClick={copyCode}>
            <Copy size={16} /> {t("copyCode")}
          </button>
        </div>
        <div className="members">
          {group?.members.map((member) => (
            <span className="member" key={member.id}>
              <span className="avatar" style={{ background: member.color }}>
                {initials(member.name)}
              </span>
              {member.name}
              {member.id === session?.profile.id ? t("you") : ""}
            </span>
          ))}
        </div>
        <label className="field">
          <span>{t("renameGroup")}</span>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onBlur={() => groupName.trim() && renameGroup(groupName.trim())}
          />
        </label>
        {error ? <p className="error">{localizeError(error)}</p> : null}
      </div>

      <div className="card">
        <h2>{t("calendarSources")}</h2>
        <p className="lede" style={{ marginTop: 8 }}>
          {t("calendarSourcesLede")}
        </p>

        <label className="drop">
          <Upload size={18} />
          <div>
            <strong>{t("dropIcs")}</strong>
            <div className="meta">{t("dropIcsMeta")}</div>
          </div>
          <input
            type="file"
            accept=".ics,text/calendar"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
              e.target.value = "";
            }}
          />
        </label>

        <form onSubmit={onUrl} style={{ marginTop: 14 }}>
          <label className="field">
            <span>{t("pasteCalendarUrl")}</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            />
          </label>
          <p className="hint">{t("googleIcalHint")}</p>
          <button className="btn" type="submit" disabled={busy}>
            {t("importUrl")}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>{t("spondTitle")}</h2>
        <p className="lede" style={{ marginTop: 8 }}>
          {t("spondLede")}
        </p>
        <form onSubmit={onSpond}>
          <label className="field">
            <span>{t("spondEmail")}</span>
            <input
              type="email"
              value={spondEmail}
              onChange={(e) => setSpondEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span>{t("spondPassword")}</span>
            <input
              type="password"
              value={spondPassword}
              onChange={(e) => setSpondPassword(e.target.value)}
              placeholder={t("yourSpondPassword")}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="btn" type="submit" disabled={spondBusy}>
            {spondBusy ? t("connectingSpond") : t("syncSpond")}
          </button>
        </form>
        <p className="hint">{t("spondHint")}</p>
      </div>

      <div className="card">
        <h2>{t("connectedSources")}</h2>

        {group?.sources.length ? (
          <div style={{ marginTop: 16 }}>
            {group.sources.map((source) => (
              <div className="source-row" key={source.id}>
                <div>
                  <strong>{source.name}</strong>
                  <div className="meta">
                    {source.kind === "spond"
                      ? t("sourceSpond")
                      : source.kind === "ics-url"
                        ? t("sourceLiveUrl")
                        : t("sourceUploaded")}
                    {source.lastImported ? ` · ${t("lastBroughtIn", { when: formatWhen(source.lastImported, language) })}` : ""}
                  </div>
                </div>
                <div className="row">
                  {source.url || source.kind === "spond" ? (
                    <button className="icon-btn" aria-label={t("refreshSource")} onClick={() => void onRefresh(source)}>
                      <RefreshCw size={16} />
                    </button>
                  ) : null}
                  <button className="btn danger" onClick={() => deleteSource(source.id)}>
                    {t("remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">{t("noSources")}</p>
        )}
        {message ? <p className="hint">{message}</p> : null}
      </div>

      <div className="row">
        <button className="btn secondary" onClick={leaveGroup}>
          {t("leaveGroup")}
        </button>
      </div>
    </section>
  );
}
