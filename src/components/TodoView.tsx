import { Check, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { uid } from "../lib/id";
import { isArchived, listFolder, uniqueFolders, withArchived, withFolder } from "../lib/listFolders";
import { useApp } from "../state/AppState";
import type { TodoList } from "../types";
import { FolderAddForm, ListArchiveButton, ListBrowser, ListFold, ListFolderField, type ListPlace } from "./ListFolders";
import { ListCard, ListShareButton } from "./ListShare";
import { MemberName } from "./MemberName";
import { NotifyToggle } from "./NotifyToggle";

export function TodoView() {
  const { group, session, t, upsertTodoList, deleteTodoList } = useApp();
  const [listName, setListName] = useState("");
  const [folder, setFolder] = useState("");
  const [folderKey, setFolderKey] = useState(0);
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const lists = [...(group?.todos ?? [])];
  const folders = uniqueFolders(lists);

  const addList = (event: FormEvent) => {
    event.preventDefault();
    if (!listName.trim() || !session) return;
    const name = listFolder(folder);
    upsertTodoList({
      id: uid("todo"),
      name: listName.trim(),
      memberId: session.profile.id,
      createdAt: Date.now(),
      items: [],
      ...(name ? { folder: name } : {}),
    });
    setListName("");
    setFolder("");
    setFolderKey((key) => key + 1);
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

  const renderTodoList = (list: TodoList, place: ListPlace) => {
    const items = [...list.items].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
    const archived = isArchived(list);
    return (
      <ListCard className="list-row" key={list.id} listId={list.id}>
        <ListFold
          fold
          startOpen={place === "standalone"}
          listId={list.id}
          summary={
            <div className="list-row-head">
              <span className="list-row-name">{list.name}</span>
              <span className="more">{t("itemsOnList", { n: list.items.length })}</span>
            </div>
          }
        >
          <div className="list-row-tools">
            {group?.code ? (
              <ListShareButton className="btn secondary small" groupCode={group.code} listId={list.id} listName={list.name} />
            ) : null}
            <ListFolderField
              value={listFolder(list.folder)}
              folders={folders}
              datalistId={`todo-folder-${list.id}`}
              reveal
              onCommit={(next) => {
                const updated = withFolder(list, next);
                if (updated !== list) upsertTodoList(updated);
              }}
            />
            <ListArchiveButton archived={archived} onToggle={() => upsertTodoList(withArchived(list, !archived))} />
            <button className="btn danger small" onClick={() => deleteTodoList(list.id)}>
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
                  <div>
                    <strong>{item.name}</strong>
                    <div className="meta">
                      <MemberName
                        memberId={item.memberId}
                        members={group?.members}
                        groupCode={group?.code}
                        fallbackName={t("someone")}
                      />
                    </div>
                  </div>
                  <button className="icon-btn" aria-label={t("deleteItem")} onClick={() => removeItem(list.id, item.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form
            className="composer two"
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
        </ListFold>
      </ListCard>
    );
  };

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("todosEyebrow")}</div>
          <h2>{t("todosTitle")}</h2>
        </div>
        <NotifyToggle channel="todos" />
      </div>

      <div className="card">
        <p className="lede" style={{ marginTop: 0 }}>
          {t("todosLede")}
        </p>
        <form className="composer assign" onSubmit={addList}>
          <input
            className="list-name"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder={t("todosNamePlaceholder")}
          />
          <div className="composer-tools">
            <ListFolderField
              value={folder}
              folders={folders}
              datalistId="todo-new-folder"
              resetKey={folderKey}
              reveal
              onChange={setFolder}
            />
            <button className="btn" type="submit">
              <Plus size={18} />
              {t("createTodoList")}
            </button>
          </div>
        </form>
      </div>

      {lists.length === 0 ? (
        <div className="card">
          <p className="empty">{t("noTodoLists")}</p>
        </div>
      ) : (
        <ListBrowser
          lists={lists}
          renderList={renderTodoList}
          renderAdd={(folderName) => (
            <FolderAddForm
              placeholder={t("todosNamePlaceholder")}
              submitLabel={t("createTodoList")}
              onAdd={(name) => {
                if (!session || !name) return false;
                upsertTodoList({
                  id: uid("todo"),
                  name,
                  memberId: session.profile.id,
                  createdAt: Date.now(),
                  items: [],
                  folder: folderName,
                });
                return true;
              }}
            />
          )}
        />
      )}
    </section>
  );
}
