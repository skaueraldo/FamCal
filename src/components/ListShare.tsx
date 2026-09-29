import { Share2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { listAppLink } from "../lib/listShare";
import { useApp } from "../state/AppState";

export function ListShareButton({
  listId,
  listName,
  groupCode,
  className = "btn secondary",
}: {
  listId: string;
  listName: string;
  groupCode: string;
  className?: string;
}) {
  const { t } = useApp();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = listAppLink(groupCode, listId);
    const title = t("shareListTitle", { name: listName });
    const text = t("shareListText", { name: listName });
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button className={className} type="button" onClick={() => void share()}>
      <Share2 size={16} />
      {copied ? t("shareListCopied") : t("shareList")}
    </button>
  );
}

export function ListCard({
  listId,
  className,
  style,
  children,
}: {
  listId: string;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { openListId, clearOpenListId } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const focused = openListId === listId;

  useEffect(() => {
    if (!focused) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const timer = window.setTimeout(() => clearOpenListId(), 1800);
    return () => window.clearTimeout(timer);
  }, [focused, clearOpenListId]);

  return (
    <div ref={ref} id={`list-${listId}`} className={`${className}${focused ? " list-focus" : ""}`} style={style}>
      {children}
    </div>
  );
}
