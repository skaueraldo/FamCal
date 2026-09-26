import { useEffect, useState } from "react";
import { CHANGELOG } from "../lib/changelog";
import { localeTag } from "../lib/i18n";
import { captureOwnerKey, readOwnerKey } from "../lib/owner";
import { MENU_SECTIONS, type MenuSection } from "../lib/storage";
import { fetchOwnerGroups } from "../lib/sync";
import { useApp } from "../state/AppState";

const menuLabels: Record<MenuSection, "tabCalendar" | "tabDinner" | "tabShopping" | "tabTodos" | "tabSpendings" | "tabWishlist" | "tabGroup"> = {
  calendar: "tabCalendar",
  dinner: "tabDinner",
  shopping: "tabShopping",
  todos: "tabTodos",
  spendings: "tabSpendings",
  wishlist: "tabWishlist",
  group: "tabGroup",
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function SettingsView() {
  const { theme, setTheme, language, setLanguage, menu, setMenuSection, t } = useApp();
  const installed = isStandalone();
  const [ownerGroups, setOwnerGroups] = useState<
    { name: string; owner: string; members: number; createdAt: number }[] | null
  >(null);

  useEffect(() => {
    const key = captureOwnerKey() || readOwnerKey();
    if (!key) return;
    let cancelled = false;
    void fetchOwnerGroups({ ownerKey: key }).then((list) => {
      if (!cancelled) setOwnerGroups(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("settingsEyebrow")}</div>
          <h2>{t("settingsTitle")}</h2>
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

        <h2 style={{ marginTop: 22 }}>{t("menuTitle")}</h2>
        <p className="lede" style={{ marginTop: 8 }}>
          {t("menuLede")}
        </p>
        <div className="menu-toggles" role="group" aria-label={t("menuTitle")}>
          {MENU_SECTIONS.map((section) => {
            const on = menu[section];
            return (
              <label key={section} className={`menu-toggle${on ? " on" : ""}`}>
                <span>{t(menuLabels[section])}</span>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setMenuSection(section, !on)}
                />
              </label>
            );
          })}
        </div>

        <h2 style={{ marginTop: 22 }}>{t("addToHomeScreen")}</h2>
        <p className="lede" style={{ marginTop: 8 }}>
          {installed ? t("runningAsApp") : t("addToHomeScreenLede")}
        </p>
      </div>

      <div className="card">
        <h2>{t("changelogTitle")}</h2>
        <p className="lede" style={{ marginTop: 8 }}>
          {t("changelogLede")}
        </p>
        <ol className="changelog">
          {CHANGELOG.map((entry) => (
            <li className="changelog-entry" key={entry.date}>
              <time dateTime={entry.date}>
                {new Date(`${entry.date}T12:00:00`).toLocaleDateString(localeTag(language), {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              <ul>
                {entry.items.map((item) => (
                  <li key={item.en}>{item[language]}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      {ownerGroups ? (
        <div className="card">
          <h2>{t("ownerGroupsTitle")}</h2>
          <p className="lede" style={{ marginTop: 8 }}>
            {t("ownerGroupsLede")}
          </p>
          {ownerGroups.length ? (
            <ul className="owner-groups">
              {ownerGroups.map((item, index) => (
                <li key={`${item.name}:${index}`}>
                  <div>
                    <strong>{item.name}</strong>
                    {item.owner ? <div className="meta">{t("ownerGroupOwner", { name: item.owner })}</div> : null}
                    {item.createdAt ? (
                      <div className="meta">
                        {t("ownerGroupCreated", {
                          date: new Date(item.createdAt).toLocaleDateString(localeTag(language), {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }),
                        })}
                      </div>
                    ) : null}
                  </div>
                  <span>
                    {item.members === 1
                      ? t("ownerGroupMembersOne")
                      : t("ownerGroupMembersMany", { n: item.members })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">{t("ownerGroupsEmpty")}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
