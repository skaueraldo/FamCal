import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { uid } from "../lib/id";
import { useApp } from "../state/AppState";
import { NotifyToggle } from "./NotifyToggle";

export function WishlistView() {
  const { group, session, t, upsertWishlist, deleteWishlist } = useApp();
  const [listName, setListName] = useState("");
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const lists = [...(group?.wishlists ?? [])].sort((a, b) => b.createdAt - a.createdAt);

  const addList = (event: FormEvent) => {
    event.preventDefault();
    if (!listName.trim() || !session) return;
    upsertWishlist({
      id: uid("wish"),
      name: listName.trim(),
      memberId: session.profile.id,
      createdAt: Date.now(),
      items: [],
    });
    setListName("");
  };

  const addItem = (listId: string) => {
    if (!session) return;
    const list = lists.find((entry) => entry.id === listId);
    const name = (itemDrafts[listId] || "").trim();
    if (!list || !name) return;
    upsertWishlist({
      ...list,
      items: [
        ...list.items,
        { id: uid("witem"), name, memberId: session.profile.id, createdAt: Date.now() },
      ],
    });
    setItemDrafts((current) => ({ ...current, [listId]: "" }));
  };

  const removeItem = (listId: string, itemId: string) => {
    const list = lists.find((entry) => entry.id === listId);
    if (!list) return;
    upsertWishlist({ ...list, items: list.items.filter((item) => item.id !== itemId) });
  };

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("wishlistEyebrow")}</div>
          <h1>{t("wishlistTitle")}</h1>
        </div>
        <NotifyToggle channel="wishlist" />
      </div>

      <div className="card">
        <p className="lede" style={{ marginTop: 0 }}>
          {t("wishlistLede")}
        </p>
        <form className="composer two" onSubmit={addList}>
          <input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder={t("wishlistNamePlaceholder")}
          />
          <button className="btn" type="submit">
            <Plus size={18} />
            {t("createWishlist")}
          </button>
        </form>
      </div>

      {lists.length === 0 ? (
        <div className="card">
          <p className="empty">{t("noWishlists")}</p>
        </div>
      ) : (
        lists.map((list) => (
          <div className="card" key={list.id}>
            <div className="wishlist-head">
              <div>
                <h2>{list.name}</h2>
                <div className="meta">{t("itemsOnList", { n: list.items.length })}</div>
              </div>
              <button className="btn danger" onClick={() => deleteWishlist(list.id)}>
                {t("deleteWishlist")}
              </button>
            </div>
            {list.items.length === 0 ? (
              <p className="empty">{t("emptyWishlist")}</p>
            ) : (
              <div className="shop-list">
                {list.items.map((item) => (
                  <div className="wish-item" key={item.id}>
                    <strong>{item.name}</strong>
                    <button className="icon-btn" aria-label={t("deleteItem")} onClick={() => removeItem(list.id, item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form
              className="composer two"
              style={{ marginTop: 12 }}
              onSubmit={(event) => {
                event.preventDefault();
                addItem(list.id);
              }}
            >
              <input
                value={itemDrafts[list.id] ?? ""}
                onChange={(e) => setItemDrafts((current) => ({ ...current, [list.id]: e.target.value }))}
                placeholder={t("wishItemPlaceholder")}
              />
              <button className="btn" type="submit" aria-label={t("addItem")}>
                <Plus size={18} />
              </button>
            </form>
          </div>
        ))
      )}
    </section>
  );
}
