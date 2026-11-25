import { Check } from "lucide-react";
import { formatDayShort, formatMoney } from "../lib/dates";
import type { ListShareKind, SharedListSnapshot, SharedSpendItem, SharedTodoItem, SharedWishItem } from "../lib/listShare";
import type { Lang } from "../lib/i18n";
import { useApp } from "../state/AppState";

export function SharedListView() {
  const { t, language, setLanguage, shareGate, sharedView, session, closeSharedList } = useApp();
  const view = shareGate === "view" ? sharedView : null;
  const kind = view?.scope === "folder" ? view.folder.kind : view?.list.kind;
  const title = view?.scope === "folder" ? view.folder.name : view?.list.name;
  const kindLabel = kind === "wishlist" ? t("tabWishlist") : kind === "spendings" ? t("tabSpendings") : t("tabTodos");

  return (
    <div className="welcome">
      <div className="welcome-card shared-card">
        <div className="brand-mark">F</div>
        {view && title ? (
          <>
            <p className="shared-kind">{kindLabel}</p>
            <h1>{title}</h1>
            <p className="lede">{view.scope === "folder" ? t("shareFolderViewLede") : t("shareListViewLede")}</p>
            {view.scope === "list" ? (
              <SharedListBlock kind={view.list.kind} items={view.list.items} language={language} someone={t("someone")} emptyLabel={t("emptyTodoList")} totalFor={(amount) => t("spendTotal", { amount })} />
            ) : view.folder.lists.length === 0 ? (
              <p className="empty">{t("emptyTodoList")}</p>
            ) : (
              view.folder.lists.map((list, index) => (
                <section className="shared-folder-list" key={`${list.name}-${index}`}>
                  <h2>{list.name}</h2>
                  <SharedListBlock kind={view.folder.kind} items={list.items} language={language} someone={t("someone")} emptyLabel={t("emptyTodoList")} totalFor={(amount) => t("spendTotal", { amount })} />
                </section>
              ))
            )}
          </>
        ) : (
          <>
            <h1>FamCal</h1>
            <p className="lede">{shareGate === "missing" ? t("shareListUnavailable") : t("shareListOpening")}</p>
          </>
        )}
        {session ? (
          <button className="btn secondary" type="button" onClick={closeSharedList}>
            {t("shareListBack")}
          </button>
        ) : null}
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

function SharedListBlock({
  kind,
  items,
  language,
  someone,
  emptyLabel,
  totalFor,
}: {
  kind: ListShareKind;
  items: SharedListSnapshot["items"];
  language: Lang;
  someone: string;
  emptyLabel: string;
  totalFor: (amount: string) => string;
}) {
  if (items.length === 0) return <p className="empty">{emptyLabel}</p>;
  if (kind === "todos") return <TodoRows items={items as SharedTodoItem[]} someone={someone} />;
  if (kind === "wishlist") return <WishRows items={items as SharedWishItem[]} someone={someone} />;
  const spendItems = items as SharedSpendItem[];
  return <SpendRows items={spendItems} someone={someone} language={language} totalLabel={totalFor(formatMoney(spendTotal(spendItems), language))} />;
}

function TodoRows({ items, someone }: { items: SharedTodoItem[]; someone: string }) {
  const ordered = [...items].sort((a, b) => Number(a.done) - Number(b.done));
  return (
    <div className="shared-list shop-list">
      {ordered.map((item, index) => (
        <div className={`shop-item${item.done ? " done" : ""}`} key={`${item.name}-${index}`}>
          <span className={`check static${item.done ? " on" : ""}`} aria-hidden="true">
            {item.done ? <Check size={14} /> : null}
          </span>
          <div>
            <strong>{item.name}</strong>
            <div className="meta">{item.addedBy || someone}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WishRows({ items, someone }: { items: SharedWishItem[]; someone: string }) {
  return (
    <div className="shared-list">
      {items.map((item, index) => (
        <div className="wish-item readonly" key={`${item.name}-${index}`}>
          <i style={{ background: "var(--ink-soft)" }} />
          <div>
            <strong>{item.name}</strong>
            <div className="meta">{item.addedBy || someone}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function spendTotal(items: SharedSpendItem[]): number {
  return items.reduce((sum, item) => sum + item.cost, 0);
}

function SpendRows({
  items,
  someone,
  language,
  totalLabel,
}: {
  items: SharedSpendItem[];
  someone: string;
  language: "en" | "no";
  totalLabel: string;
}) {
  const people = new Map<string, number>();
  for (const item of items) {
    const name = item.addedBy || someone;
    people.set(name, (people.get(name) || 0) + item.cost);
  }
  return (
    <>
      <div className="shared-list spend-list">
        {items.map((item, index) => (
          <div className="spend-item readonly" key={`${item.name}-${index}`}>
            <i style={{ background: "var(--ink-soft)" }} />
            <div>
              <strong>{item.name}</strong>
              <div className="meta">
                {item.date ? formatDayShort(item.date, language) : null} {item.addedBy || someone}
              </div>
            </div>
            <div className="spend-cost">{formatMoney(item.cost, language)}</div>
          </div>
        ))}
      </div>
      <div className="spend-totals">
        <strong>{totalLabel}</strong>
        {[...people.entries()].map(([name, amount]) => (
          <span key={name}>
            {name}: {formatMoney(amount, language)}
          </span>
        ))}
      </div>
    </>
  );
}
