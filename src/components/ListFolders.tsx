import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { partitionClusters, listFolder, splitArchived } from "../lib/listFolders";
import { useApp } from "../state/AppState";

export type ListPlace = "folder" | "standalone" | "archived";

const FolderFoldCommand = createContext<{ open: boolean; gen: number } | null>(null);

export function ListFolderField({
  value,
  folders,
  datalistId,
  resetKey = 0,
  onChange,
  onCommit,
}: {
  value: string;
  folders: string[];
  datalistId: string;
  resetKey?: number;
  onChange?: (value: string) => void;
  onCommit?: (value: string) => void;
}) {
  const { t } = useApp();

  return (
    <>
      <input
        key={`${datalistId}-${resetKey}-${onCommit ? value : "new"}`}
        className="list-folder-input"
        list={datalistId}
        defaultValue={value}
        aria-label={t("listFolder")}
        placeholder={t("listFolderPlaceholder")}
        onChange={(event) => onChange?.(event.target.value)}
        onBlur={(event) => {
          const next = listFolder(event.currentTarget.value);
          event.currentTarget.value = next;
          onChange?.(next);
          onCommit?.(next);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || !onCommit) return;
          event.preventDefault();
          event.currentTarget.blur();
        }}
      />
      <datalist id={datalistId}>
        {folders.map((folder) => (
          <option key={folder} value={folder} />
        ))}
      </datalist>
    </>
  );
}

export function ListArchiveButton({ archived, onToggle }: { archived: boolean; onToggle: () => void }) {
  const { t } = useApp();
  return (
    <button className="btn secondary small" type="button" onClick={onToggle}>
      {archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
      {archived ? t("unarchiveList") : t("archiveList")}
    </button>
  );
}

export function FolderAddForm({
  placeholder,
  submitLabel,
  extra,
  onAdd,
}: {
  placeholder: string;
  submitLabel: string;
  extra?: ReactNode;
  onAdd: (name: string) => boolean;
}) {
  const [name, setName] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!onAdd(name.trim())) return;
    setName("");
  };

  return (
    <form className="composer assign list-folder-add" onSubmit={submit}>
      <input className="list-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={placeholder} />
      <div className="composer-tools">
        {extra}
        <button className="btn small" type="submit">
          <Plus size={16} />
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function ListFold({
  fold,
  startOpen,
  listId,
  summary,
  children,
}: {
  fold: boolean;
  startOpen?: boolean;
  listId: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const { openListId } = useApp();
  const command = useContext(FolderFoldCommand);
  const focused = openListId === listId;
  const [open, setOpen] = useState(!fold || Boolean(startOpen) || focused);

  useEffect(() => {
    if (focused) setOpen(true);
  }, [focused]);

  useEffect(() => {
    if (!fold || !command) return;
    setOpen(command.open);
  }, [fold, command]);

  if (!fold) {
    return (
      <>
        {summary}
        {children}
      </>
    );
  }

  return (
    <details className="list-fold" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="list-fold-summary">{summary}</summary>
      <div className="list-fold-body">{children}</div>
    </details>
  );
}

function NamedFolder({
  name,
  count,
  startOpen,
  forceOpen,
  foldLists,
  add,
  children,
}: {
  name: string;
  count: string;
  startOpen: boolean;
  forceOpen?: boolean;
  foldLists?: boolean;
  add?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useApp();
  const [open, setOpen] = useState(startOpen || Boolean(forceOpen));
  const [foldCommand, setFoldCommand] = useState<{ open: boolean; gen: number } | null>(null);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const setAll = (next: boolean) => (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
    if (next) setOpen(true);
    setFoldCommand((current) => ({ open: next, gen: (current?.gen ?? 0) + 1 }));
  };

  return (
    <FolderFoldCommand.Provider value={foldCommand}>
      <details className="list-group" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="list-folder-title">
          <span>{name}</span>
          <span className="list-folder-actions" onClick={(event) => event.preventDefault()}>
            {foldLists ? (
              <>
                <button className="list-folder-toggle" type="button" onClick={setAll(true)}>
                  {t("listFolderExpandAll")}
                </button>
                <button className="list-folder-toggle" type="button" onClick={setAll(false)}>
                  {t("listFolderCollapseAll")}
                </button>
              </>
            ) : null}
            <span className="more">{count}</span>
          </span>
        </summary>
        <div className="list-group-inner">
          {children}
          {add}
        </div>
      </details>
    </FolderFoldCommand.Provider>
  );
}

function folderCount(n: number, t: (key: "listFolderCountOne" | "listFolderCountMany", vars?: Record<string, string | number>) => string) {
  return n === 1 ? t("listFolderCountOne") : t("listFolderCountMany", { n });
}

export function ListBrowser<T extends { id: string; folder?: string; createdAt: number; archivedAt?: number }>({
  lists,
  renderList,
  renderAdd,
}: {
  lists: T[];
  renderList: (list: T, place: ListPlace) => ReactNode;
  renderAdd?: (folder: string) => ReactNode;
}) {
  const { t, openListId } = useApp();
  const { active, archived } = splitArchived(lists);
  const { folders, standalone } = partitionClusters(active);
  const archivedParts = partitionClusters(archived);
  const focusIn = (entries: T[]) => entries.some((list) => list.id === openListId);

  return (
    <>
      {folders.length ? (
        <section className="list-section">
          <h3 className="list-section-title">{t("listSectionFolders")}</h3>
          {folders.map((cluster) => (
            <NamedFolder
              key={cluster.folder}
              name={cluster.folder}
              count={folderCount(cluster.lists.length, t)}
              startOpen
              forceOpen={focusIn(cluster.lists)}
              foldLists
              add={renderAdd?.(cluster.folder)}
            >
              {cluster.lists.map((list) => renderList(list, "folder"))}
            </NamedFolder>
          ))}
        </section>
      ) : null}

      {standalone.length ? (
        <section className="list-section">
          <h3 className="list-section-title">{t("listSectionLists")}</h3>
          <div className="list-section-rows">
            {standalone.map((list) => renderList(list, "standalone"))}
          </div>
        </section>
      ) : null}

      {archived.length ? (
        <section className="list-section">
          <NamedFolder
            name={t("archivedLists")}
            count={folderCount(archived.length, t)}
            startOpen={false}
            forceOpen={focusIn(archived)}
            foldLists
          >
            {archivedParts.folders.map((cluster) => (
              <div className="list-archived-folder" key={cluster.folder}>
                <h4 className="list-archived-folder-title">{cluster.folder}</h4>
                {cluster.lists.map((list) => renderList(list, "archived"))}
              </div>
            ))}
            {archivedParts.standalone.map((list) => renderList(list, "archived"))}
          </NamedFolder>
        </section>
      ) : null}
    </>
  );
}
