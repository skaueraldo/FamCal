import { GroupAccessForm } from "./GroupAccessForm";
import { useApp } from "../state/AppState";

export function Welcome() {
  const { t, language, setLanguage, error, localizeError } = useApp();

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="brand-mark">F</div>
        <h1>{t("welcomeTitle")}</h1>
        <p className="lede">{t("welcomeLede")}</p>
        {error ? <p className="error">{localizeError(error)}</p> : null}
        <GroupAccessForm defaultMode="create" />
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
