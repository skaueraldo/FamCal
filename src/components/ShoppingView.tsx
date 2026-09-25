import { Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { uid } from "../lib/id";
import { suggestShopItems } from "../lib/shop";
import { useApp } from "../state/AppState";
import type { ShopHistoryEntry } from "../types";
import { NotifyToggle } from "./NotifyToggle";

export function ShoppingView() {
  const { group, session, upsertItem, deleteItem, clearItems, t } = useApp();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");

  const items = useMemo(
    () => [...(group?.items ?? [])].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt),
    [group?.items],
  );
  const suggestions = useMemo(
    () => suggestShopItems(group?.shopHistory ?? [], group?.items ?? [], name),
    [group?.items, group?.shopHistory, name],
  );

  const who = (id: string) => group?.members.find((m) => m.id === id)?.name ?? t("someone");

  const addNamed = (itemName: string, itemQty?: string) => {
    if (!itemName.trim() || !session) return;
    upsertItem({
      id: uid("shop"),
      name: itemName.trim(),
      qty: itemQty?.trim() || undefined,
      done: false,
      memberId: session.profile.id,
      createdAt: Date.now(),
    });
    setName("");
    setQty("");
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    addNamed(name, qty);
  };

  const addSuggestion = (entry: ShopHistoryEntry) => {
    addNamed(entry.name, qty.trim() || entry.qty);
  };

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("shoppingEyebrow")}</div>
          <h1>{t("shoppingTitle")}</h1>
        </div>
        <NotifyToggle channel="shopping" />
      </div>

      <div className="card">
        <p className="lede" style={{ marginTop: 0 }}>
          {t("shoppingLede")}
        </p>
        <form className="composer" onSubmit={add}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("itemPlaceholder")} />
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={t("quantity")}
            aria-label={t("quantity")}
          />
          <button className="btn" type="submit" aria-label={t("addItem")}>
            <Plus size={18} />
          </button>
        </form>

        {suggestions.length > 0 ? (
          <div className="shop-suggest">
            <div className="meta">{t("shopSuggestions")}</div>
            <div className="shop-suggest-list">
              {suggestions.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className="shop-suggest-chip"
                  aria-label={t("addSuggestedItem", { name: entry.name })}
                  onClick={() => addSuggestion(entry)}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {items.length === 0 ? (
          <p className="empty">{t("emptyList")}</p>
        ) : (
          <div className="shop-list">
            <div className="shop-actions">
              <button className="btn danger small" type="button" onClick={clearItems}>
                <Trash2 size={16} />
                {t("emptyShoppingList")}
              </button>
            </div>
            {items.map((item) => (
              <div className={`shop-item${item.done ? " done" : ""}`} key={item.id}>
                <button
                  className={`check${item.done ? " on" : ""}`}
                  aria-label={item.done ? t("markAsNeeded") : t("markAsBought")}
                  onClick={() => upsertItem({ ...item, done: !item.done })}
                >
                  {item.done ? <Check size={14} /> : null}
                </button>
                <div>
                  <div className="name">
                    <strong>{item.name}</strong>
                    {item.qty ? ` · ${item.qty}` : ""}
                  </div>
                  <div className="meta">{t("addedBy", { name: who(item.memberId) })}</div>
                </div>
                <button className="icon-btn" aria-label={t("deleteItem")} onClick={() => deleteItem(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
