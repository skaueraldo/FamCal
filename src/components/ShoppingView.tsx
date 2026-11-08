import { Archive, Check, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { FOOD_CATEGORIES, FOOD_CATEGORY_KEY, categorizeFood, foodCategoryOf, itemFoodCategory, type FoodCategory } from "../lib/food";
import { uid } from "../lib/id";
import { localeTag } from "../lib/i18n";
import { shoppingArchiveName, suggestShopItems } from "../lib/shop";
import { useApp } from "../state/AppState";
import type { ShopArchive, ShopHistoryEntry, ShopItem } from "../types";
import { MemberName } from "./MemberName";
import { NotifyToggle } from "./NotifyToggle";
import { PriceCheck } from "./PriceCheck";

export function ShoppingView() {
  const { group, session, language, upsertItem, deleteItem, clearItems, archiveShoppingList, copyShopArchive, deleteShopArchive, t } = useApp();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCategory, setOverCategory] = useState<FoodCategory | null>(null);
  const dragRef = useRef<{ id: string; category: FoodCategory | null } | null>(null);

  const items = useMemo(
    () => [...(group?.items ?? [])].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt),
    [group?.items],
  );
  const grouped = useMemo(() => {
    const locale = localeTag(language);
    const buckets = new Map<string, ShopItem[]>();
    for (const item of items) {
      const key = itemFoodCategory(item);
      buckets.set(key, [...(buckets.get(key) ?? []), item]);
    }
    return FOOD_CATEGORIES.filter((category) => buckets.has(category)).map((category) => ({
      category,
      items: [...(buckets.get(category) ?? [])].sort(
        (a, b) => Number(a.done) - Number(b.done) || a.name.localeCompare(b.name, locale),
      ),
    }));
  }, [items, language]);
  useEffect(() => {
    for (const item of group?.items ?? []) {
      if (item.category) continue;
      const category = categorizeFood(item.name);
      if (category === "other") continue;
      upsertItem({ ...item, category });
    }
  }, [group?.items, upsertItem]);

  const archives = useMemo(
    () => [...(group?.shopArchives ?? [])].sort((a, b) => b.createdAt - a.createdAt),
    [group?.shopArchives],
  );

  const suggestions = useMemo(
    () => suggestShopItems(group?.shopHistory ?? [], group?.items ?? [], name),
    [group?.items, group?.shopHistory, name],
  );

  const addNamed = (itemName: string, itemQty?: string) => {
    if (!itemName.trim() || !session) return;
    const category = categorizeFood(itemName);
    upsertItem({
      id: uid("shop"),
      name: itemName.trim(),
      qty: itemQty?.trim() || undefined,
      category: category === "other" ? undefined : category,
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

  const itemsRef = useRef(group?.items ?? []);
  itemsRef.current = group?.items ?? [];
  const upsertRef = useRef(upsertItem);
  upsertRef.current = upsertItem;

  const categoryUnderPointer = (event: PointerEvent) => {
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const zone = hit?.closest<HTMLElement>("[data-drop-category]");
    return zone?.dataset.dropCategory ? foodCategoryOf(zone.dataset.dropCategory) : null;
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers cannot be captured; window listeners still receive the gesture.
    }
    dragRef.current = { id, category: null };
    setDragId(id);
    setOverCategory(null);
    const move = (pointerEvent: PointerEvent) => {
      if (!dragRef.current) return;
      const category = categoryUnderPointer(pointerEvent);
      if (dragRef.current.category === category) return;
      dragRef.current = { ...dragRef.current, category };
      setOverCategory(category);
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      const current = dragRef.current;
      dragRef.current = null;
      setDragId(null);
      setOverCategory(null);
      if (!current?.category) return;
      const item = itemsRef.current.find((entry) => entry.id === current.id);
      if (!item || itemFoodCategory(item) === current.category) return;
      upsertRef.current({ ...item, category: current.category });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  const archiveCurrent = () => {
    if (!items.length || !window.confirm(t("archiveShoppingConfirm"))) return;
    setCopyNote(null);
    archiveShoppingList(shoppingArchiveName(Date.now(), localeTag(language), archives));
  };

  const copyArchive = (archive: ShopArchive) => {
    const { added, skipped } = copyShopArchive(archive.id);
    if (added === 0) setCopyNote(t("copiedShoppingNone", { name: archive.name }));
    else if (skipped > 0) setCopyNote(t("copiedShoppingPartial", { n: added, name: archive.name }));
    else setCopyNote(t("copiedShopping", { n: added, name: archive.name }));
  };

  const removeArchive = (archive: ShopArchive) => {
    if (!window.confirm(t("deleteArchivedShoppingConfirm", { name: archive.name }))) return;
    setCopyNote(null);
    deleteShopArchive(archive.id);
  };

  const sections = dragId
    ? FOOD_CATEGORIES.map((category) => ({
        category,
        items: grouped.find((section) => section.category === category)?.items ?? [],
      }))
    : grouped;

  const renderItem = (item: ShopItem) => (
    <div className={`shop-item draggable${item.done ? " done" : ""}${dragId === item.id ? " dragging" : ""}`} key={item.id}>
      <button
        type="button"
        className="icon-btn shop-drag"
        aria-label={t("dragItem", { name: item.name })}
        onPointerDown={(event) => startDrag(event, item.id)}
      >
        <GripVertical size={16} />
      </button>
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
        <div className="meta">
          <MemberName
            memberId={item.memberId}
            members={group?.members}
            groupCode={group?.code}
            fallbackName={t("someone")}
            prefix={t("addedBy")}
          />
        </div>
        <select
          className="shop-category-select"
          aria-label={t("moveItemCategory", { name: item.name })}
          value={itemFoodCategory(item)}
          onChange={(event) => upsertItem({ ...item, category: foodCategoryOf(event.target.value) })}
        >
          {FOOD_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(FOOD_CATEGORY_KEY[category])}
            </option>
          ))}
        </select>
      </div>
      <button className="icon-btn" aria-label={t("deleteItem")} onClick={() => deleteItem(item.id)}>
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("shoppingEyebrow")}</div>
          <h2>{t("shoppingTitle")}</h2>
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
              <button className="btn secondary small" type="button" onClick={archiveCurrent}>
                <Archive size={16} />
                {t("archiveShoppingList")}
              </button>
              <button className="btn danger small" type="button" onClick={clearItems}>
                <Trash2 size={16} />
                {t("emptyShoppingList")}
              </button>
            </div>
            {sections.map((section) => (
              <section
                className={`shop-category${overCategory === section.category ? " drop-target" : ""}${section.items.length === 0 ? " empty-drop" : ""}`}
                key={section.category}
                data-drop-category={section.category}
              >
                <h3>{t(FOOD_CATEGORY_KEY[section.category])}</h3>
                {section.items.map(renderItem)}
              </section>
            ))}
            {items.some((item) => !item.done) ? (
              <PriceCheck
                items={items.filter((item) => !item.done).map((item) => ({ id: item.id, name: item.name, qty: item.qty }))}
              />
            ) : null}
          </div>
        )}

        {archives.length > 0 ? (
          <div className="shop-archives">
            <h3>{t("archivedShopping")}</h3>
            {copyNote ? <p className="meta shop-copy-note">{copyNote}</p> : null}
            {archives.map((archive) => (
              <div className="shop-archive" key={archive.id}>
                <div>
                  <strong>{archive.name}</strong>
                  <div className="meta">{t("itemsOnList", { n: archive.items.length })}</div>
                  <div className="shop-archive-items">{archive.items.map((item) => item.name).join(", ")}</div>
                </div>
                <button className="btn secondary small" type="button" onClick={() => copyArchive(archive)}>
                  <Copy size={16} />
                  {t("copyShoppingList")}
                </button>
                <button className="icon-btn" type="button" aria-label={t("deleteArchivedShopping")} onClick={() => removeArchive(archive)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
