import { Plus, Trash2 } from "lucide-react";
import { useState, type CSSProperties, type FormEvent } from "react";
import { memberColorOf } from "../lib/events";
import { uid } from "../lib/id";
import { isArchived, listFolder, uniqueFolders, withArchived, withFolder } from "../lib/listFolders";
import { useApp } from "../state/AppState";
import type { Wishlist } from "../types";
import { FolderAddForm, ListArchiveButton, ListBrowser, ListFold, ListFolderField, type ListPlace } from "./ListFolders";
import { ListCard, ListShareButton } from "./ListShare";
import { MemberName } from "./MemberName";
import { MemberSelect } from "./MemberSelect";
import { NotifyToggle } from "./NotifyToggle";

export function WishlistView() {
  const { group, session, t, upsertWishlist, deleteWishlist } = useApp();
  const [listName, setListName] = useState("");
  const [folder, setFolder] = useState("");
  const [folderKey, setFolderKey] = useState(0);
  const [listMemberId, setListMemberId] = useState(session?.profile.id ?? "");
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const lists = [...(group?.wishlists ?? [])];
  const folders = uniqueFolders(lists);
  const members = group?.members ?? [];
  const memberColor = (id: string) => memberColorOf(members, id);
  const addList = (event: FormEvent) => {
    event.preventDefault();
    if (!listName.trim() || !session) return;
    const owner = members.some((member) => member.id === listMemberId) ? listMemberId : session.profile.id;
    const name = listFolder(folder);
    upsertWishlist({
      id: uid("wish"),
      name: listName.trim(),
      memberId: owner,
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

  const renderWishlist = (list: Wishlist, place: ListPlace) => {
    const archivedList = isArchived(list);
    return (
      <ListCard className="list-row assigned-card" key={list.id} listId={list.id} style={{ "--member-color": memberColor(list.memberId) } as CSSProperties}>
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
            <MemberSelect
              value={list.memberId}
              onChange={(id) => upsertWishlist({ ...list, memberId: id })}
              members={members}
              label={t("assignTo")}
            />
            <ListFolderField
              value={listFolder(list.folder)}
              folders={folders}
              datalistId={`wish-folder-${list.id}`}
              onCommit={(next) => {
                const updated = withFolder(list, next);
                if (updated !== list) upsertWishlist(updated);
              }}
            />
            <ListArchiveButton archived={archivedList} onToggle={() => upsertWishlist(withArchived(list, !archivedList))} />
            <button className="btn danger small" onClick={() => deleteWishlist(list.id)}>
              {t("deleteWishlist")}
            </button>
          </div>
          {list.items.length === 0 ? (
            <p className="empty">{t("emptyWishlist")}</p>
          ) : (
            <div className="shop-list">
              {list.items.map((item) => (
                <div className="wish-item" key={item.id}>
                  <i style={{ background: memberColor(item.memberId) }} />
                  <div>
                    <strong>{item.name}</strong>
                    <div className="meta">
                      <MemberName
                        memberId={item.memberId}
                        members={members}
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
              placeholder={t("wishItemPlaceholder")}
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
          <div className="eyebrow">{t("wishlistEyebrow")}</div>
          <h2>{t("wishlistTitle")}</h2>
        </div>
        <NotifyToggle channel="wishlist" />
      </div>

      <div className="card">
        <p className="lede" style={{ marginTop: 0 }}>
          {t("wishlistLede")}
        </p>
        <form className="composer assign" onSubmit={addList}>
          <input
            className="list-name"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder={t("wishlistNamePlaceholder")}
          />
          <div className="composer-tools">
            <ListFolderField
              value={folder}
              folders={folders}
              datalistId="wish-new-folder"
              resetKey={folderKey}
              onChange={setFolder}
            />
            <MemberSelect
              value={listMemberId || session?.profile.id || ""}
              onChange={setListMemberId}
              members={members}
              label={t("assignTo")}
            />
            <button className="btn" type="submit">
              <Plus size={18} />
              {t("createWishlist")}
            </button>
          </div>
        </form>
      </div>

      {lists.length === 0 ? (
        <div className="card">
          <p className="empty">{t("noWishlists")}</p>
        </div>
      ) : (
        <ListBrowser
          lists={lists}
          renderList={renderWishlist}
          renderAdd={(folderName) => (
            <FolderAddForm
              placeholder={t("wishlistNamePlaceholder")}
              submitLabel={t("createWishlist")}
              extra={
                <MemberSelect
                  value={listMemberId || session?.profile.id || ""}
                  onChange={setListMemberId}
                  members={members}
                  label={t("assignTo")}
                />
              }
              onAdd={(name) => {
                if (!session || !name) return false;
                const owner = members.some((member) => member.id === listMemberId) ? listMemberId : session.profile.id;
                upsertWishlist({
                  id: uid("wish"),
                  name,
                  memberId: owner,
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
