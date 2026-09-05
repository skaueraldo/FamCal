import { Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useApp } from "../state/AppState";
import { uid } from "../lib/id";

export function ShoppingView() {
  const { group, session, upsertItem, deleteItem, t } = useApp();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");

  const items = useMemo(
    () => [...(group?.items ?? [])].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt),
    [group?.items],
  );

  const who = (id: string) => group?.members.find((m) => m.id === id)?.name ?? t("someone");

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !session) return;
    upsertItem({
      id: uid("shop"),
      name: name.trim(),
      qty: qty.trim() || undefined,
      done: false,
      memberId: session.profile.id,
      createdAt: Date.now(),
    });
    setName("");
    setQty("");
  };

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("shoppingEyebrow")}</div>
          <h1>{t("shoppingTitle")}</h1>
        </div>
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

        {items.length === 0 ? (
          <p className="empty">{t("emptyList")}</p>
        ) : (
          <div className="shop-list">
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
