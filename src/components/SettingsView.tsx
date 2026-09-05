import { useApp } from "../state/AppState";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function SettingsView() {
  const { theme, setTheme, language, setLanguage, t } = useApp();
  const installed = isStandalone();

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("settingsEyebrow")}</div>
          <h1>{t("settingsTitle")}</h1>
        </div>
      </div>

      <div className="card">
        <p className="lede" style={{ marginTop: 0 }}>
          {t("settingsLede")}
        </p>

        <h2>{t("appearance")}</h2>
        <div className="choice-row" role="group" aria-label={t("appearance")}>
          <button
            type="button"
            className={`choice${theme === "light" ? " active" : ""}`}
            onClick={() => setTheme("light")}
          >
            <strong>{t("lightMode")}</strong>
            <span>{t("lightModeHelp")}</span>
          </button>
          <button
            type="button"
            className={`choice${theme === "dark" ? " active" : ""}`}
            onClick={() => setTheme("dark")}
          >
            <strong>{t("darkMode")}</strong>
            <span>{t("darkModeHelp")}</span>
          </button>
        </div>

        <h2 style={{ marginTop: 22 }}>{t("language")}</h2>
        <div className="choice-row" role="group" aria-label={t("language")}>
          <button
            type="button"
            className={`choice${language === "en" ? " active" : ""}`}
            onClick={() => setLanguage("en")}
          >
            <strong>{t("english")}</strong>
            <span>English</span>
          </button>
          <button
            type="button"
            className={`choice${language === "no" ? " active" : ""}`}
            onClick={() => setLanguage("no")}
          >
            <strong>{t("norwegian")}</strong>
            <span>Norsk</span>
          </button>
        </div>

        <h2 style={{ marginTop: 22 }}>{t("addToHomeScreen")}</h2>
        <p className="lede" style={{ marginTop: 8 }}>
          {installed ? t("runningAsApp") : t("addToHomeScreenLede")}
        </p>
      </div>
    </section>
  );
}
