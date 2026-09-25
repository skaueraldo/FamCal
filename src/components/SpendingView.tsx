import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { formatDayShort, formatMoney, toISODate } from "../lib/dates";
import { uid } from "../lib/id";
import { useApp } from "../state/AppState";
import { NotifyToggle } from "./NotifyToggle";

interface SpendDraft {
  date: string;
  name: string;
  cost: string;
  memberId: string;
}

function parseCost(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

function emptyDraft(memberId: string): SpendDraft {
  return { date: toISODate(new Date()), name: "", cost: "", memberId };
}

export function SpendingView() {
  const { group, session, language, t, upsertSpendList, deleteSpendList } = useApp();
  const [listName, setListName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, SpendDraft>>({});
  const lists = [...(group?.spendings ?? [])].sort((a, b) => b.createdAt - a.createdAt);
  const members = group?.members ?? [];

  const draftFor = (listId: string): SpendDraft =>
    drafts[listId] ?? emptyDraft(session?.profile.id ?? members[0]?.id ?? "");

  const addList = (event: FormEvent) => {
    event.preventDefault();
    if (!listName.trim() || !session) return;
    upsertSpendList({
      id: uid("spend"),
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
    const draft = draftFor(listId);
    const name = draft.name.trim();
    const cost = parseCost(draft.cost);
    const spender = members.find((member) => member.id === draft.memberId) ?? session.profile;
    if (!list || !name || cost == null || !draft.date) return;
    upsertSpendList({
      ...list,
      items: [
        ...list.items,
        {
          id: uid("sitem"),
          date: draft.date,
          name,
          cost,
          memberId: spender.id,
          spenderName: spender.name,
          createdAt: Date.now(),
        },
      ],
    });
    setDrafts((current) => ({
      ...current,
      [listId]: { ...emptyDraft(spender.id), date: draft.date, memberId: spender.id },
    }));
  };

  const removeItem = (listId: string, itemId: string) => {
    const list = lists.find((entry) => entry.id === listId);
    if (!list) return;
    upsertSpendList({ ...list, items: list.items.filter((item) => item.id !== itemId) });
  };

  const who = (memberId: string, fallback: string) =>
    members.find((member) => member.id === memberId)?.name || fallback || t("someone");

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("spendingsEyebrow")}</div>
          <h1>{t("spendingsTitle")}</h1>
        </div>
        <NotifyToggle channel="spendings" />
      </div>

      <div className="card">
        <p className="lede" style={{ marginTop: 0 }}>
          {t("spendingsLede")}
        </p>
        <form className="composer two" onSubmit={addList}>
          <input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder={t("spendingsNamePlaceholder")}
          />
          <button className="btn" type="submit">
            <Plus size={18} />
            {t("createSpendingsList")}
          </button>
        </form>
      </div>

      {lists.length === 0 ? (
        <div className="card">
          <p className="empty">{t("noSpendingsLists")}</p>
        </div>
      ) : (
        lists.map((list) => {
          const items = [...list.items].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
          const totals = new Map<string, { id: string; name: string; total: number }>();
          for (const item of list.items) {
            const name = who(item.memberId, item.spenderName);
            const current = totals.get(item.memberId) ?? { id: item.memberId, name, total: 0 };
            current.total += item.cost;
            totals.set(item.memberId, current);
          }
          const people = [...totals.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
          const listTotal = list.items.reduce((sum, item) => sum + item.cost, 0);
          const draft = draftFor(list.id);

          return (
            <div className="card" key={list.id}>
              <div className="wishlist-head">
                <div>
                  <h2>{list.name}</h2>
                  <div className="meta">{t("itemsOnList", { n: list.items.length })}</div>
                </div>
                <button className="btn danger" onClick={() => deleteSpendList(list.id)}>
                  {t("deleteSpendingsList")}
                </button>
              </div>

              {items.length === 0 ? (
                <p className="empty">{t("emptySpendingsList")}</p>
              ) : (
                <>
                  <div className="spend-list">
                    {items.map((item) => (
                      <div className="spend-item" key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <div className="meta">
                            {formatDayShort(item.date, language)} · {who(item.memberId, item.spenderName)}
                          </div>
                        </div>
                        <div className="spend-cost">{formatMoney(item.cost, language)}</div>
                        <button className="icon-btn" aria-label={t("deleteItem")} onClick={() => removeItem(list.id, item.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="spend-totals">
                    {people.map((person) => (
                      <div key={person.id}>
                        {t("spendPersonTotal", { name: person.name, amount: formatMoney(person.total, language) })}
                      </div>
                    ))}
                    <strong>{t("spendTotal", { amount: formatMoney(listTotal, language) })}</strong>
                  </div>
                </>
              )}

              <form
                className="spend-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  addItem(list.id);
                }}
              >
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDrafts((current) => ({ ...current, [list.id]: { ...draft, date: e.target.value } }))}
                  aria-label={t("spendDate")}
                  required
                />
                <input
                  value={draft.name}
                  onChange={(e) => setDrafts((current) => ({ ...current, [list.id]: { ...draft, name: e.target.value } }))}
                  placeholder={t("spendItemPlaceholder")}
                  aria-label={t("spendItem")}
                />
                <input
                  value={draft.cost}
                  onChange={(e) => setDrafts((current) => ({ ...current, [list.id]: { ...draft, cost: e.target.value } }))}
                  placeholder={t("spendCostPlaceholder")}
                  inputMode="decimal"
                  aria-label={t("spendCost")}
                />
                <select
                  value={draft.memberId}
                  onChange={(e) => setDrafts((current) => ({ ...current, [list.id]: { ...draft, memberId: e.target.value } }))}
                  aria-label={t("spendSpender")}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
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
