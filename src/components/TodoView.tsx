import { Check, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { uid } from "../lib/id";
import { useApp } from "../state/AppState";
import { NotifyToggle } from "./NotifyToggle";

export function TodoView() {
  const { group, session, t, upsertTodoList, deleteTodoList } = useApp();
  const [listName, setListName] = useState("");
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const lists = [...(group?.todos ?? [])].sort((a, b) => b.createdAt - a.createdAt);

  const addList = (event: FormEvent) => {
    event.preventDefault();
    if (!listName.trim() || !session) return;
    upsertTodoList({
      id: uid("todo"),
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
    upsertTodoList({
      ...list,
      items: [
        ...list.items,
        { id: uid("titem"), name, done: false, memberId: session.profile.id, createdAt: Date.now() },
      ],
    });
    setItemDrafts((current) => ({ ...current, [listId]: "" }));
  };

  const toggleItem = (listId: string, itemId: string) => {
    const list = lists.find((entry) => entry.id === listId);
    if (!list) return;
    upsertTodoList({
      ...list,
      items: list.items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
    });
  };

  const removeItem = (listId: string, itemId: string) => {
    const list = lists.find((entry) => entry.id === listId);
    if (!list) return;
    upsertTodoList({ ...list, items: list.items.filter((item) => item.id !== itemId) });
  };

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("todosEyebrow")}</div>
          <h1>{t("todosTitle")}</h1>
        </div>
        <NotifyToggle channel="todos" />
      </div>

      <div className="card">
        <p className="lede" style={{ marginTop: 0 }}>
          {t("todosLede")}
        </p>
        <form className="composer two" onSubmit={addList}>
          <input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder={t("todosNamePlaceholder")}
          />
          <button className="btn" type="submit">
            <Plus size={18} />
            {t("createTodoList")}
          </button>
        </form>
      </div>

      {lists.length === 0 ? (
        <div className="card">
          <p className="empty">{t("noTodoLists")}</p>
        </div>
      ) : (
        lists.map((list) => {
          const items = [...list.items].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
          return (
            <div className="card" key={list.id}>
              <div className="wishlist-head">
                <div>
                  <h2>{list.name}</h2>
                  <div className="meta">{t("itemsOnList", { n: list.items.length })}</div>
                </div>
                <button className="btn danger" onClick={() => deleteTodoList(list.id)}>
                  {t("deleteTodoList")}
                </button>
              </div>
              {items.length === 0 ? (
                <p className="empty">{t("emptyTodoList")}</p>
              ) : (
                <div className="shop-list">
                  {items.map((item) => (
                    <div className={`shop-item${item.done ? " done" : ""}`} key={item.id}>
                      <button
                        className={`check${item.done ? " on" : ""}`}
                        aria-label={item.done ? t("markTodoOpen") : t("markTodoDone")}
                        onClick={() => toggleItem(list.id, item.id)}
                      >
                        {item.done ? <Check size={14} /> : null}
                      </button>
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
                  placeholder={t("todoItemPlaceholder")}
                />
                <button className="btn" type="submit" aria-label={t("addItem")}>
                  <Plus size={18} />
                </button>
              </form>
            </div>
          );
        })
      )}
    </section>
  );
}
