import { useEffect, useRef } from "react";
import { formatTime } from "../lib/dates";
import {
  markNotified,
  reminderTag,
  reminderWindow,
  showNotice,
  wasNotified,
} from "../lib/notifications";
import { useApp } from "../state/AppState";
import type { Tab } from "../types";

function isTab(value: unknown): value is Tab {
  return (
    value === "calendar" ||
    value === "dinner" ||
    value === "shopping" ||
    value === "wishlist" ||
    value === "group" ||
    value === "settings"
  );
}

export function NotificationHost() {
  const { group, session, notify, language, t, setTab } = useApp();
  const primed = useRef(false);
  const itemIds = useRef(new Set<string>());
  const eventIds = useRef(new Set<string>());
  const dinnerStamp = useRef(new Map<string, string>());
  const wishListIds = useRef(new Set<string>());
  const wishItemIds = useRef(new Set<string>());

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "open-tab" && isTab(event.data.tab)) setTab(event.data.tab);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [setTab]);

  useEffect(() => {
    primed.current = false;
    itemIds.current = new Set();
    eventIds.current = new Set();
    dinnerStamp.current = new Map();
    wishListIds.current = new Set();
    wishItemIds.current = new Set();
  }, [session?.groupCode, session?.profile.id]);

  useEffect(() => {
    if (!group || !session) {
      primed.current = false;
      return;
    }

    if (!primed.current) {
      itemIds.current = new Set(group.items.map((item) => item.id));
      eventIds.current = new Set(group.events.map((event) => event.id));
      dinnerStamp.current = new Map(group.dinners.map((dinner) => [dinner.id, dinner.title]));
      wishListIds.current = new Set(group.wishlists.map((list) => list.id));
      wishItemIds.current = new Set(group.wishlists.flatMap((list) => list.items.map((item) => `${list.id}:${item.id}`)));
      primed.current = true;
      return;
    }

    const me = session.profile.id;
    const memberName = (id: string) => group.members.find((member) => member.id === id)?.name ?? t("someone");

    if (notify.shopping) {
      for (const item of group.items) {
        if (itemIds.current.has(item.id)) continue;
        itemIds.current.add(item.id);
        if (item.memberId === me) continue;
        const tag = `shop:${item.id}`;
        if (wasNotified(tag)) continue;
        markNotified(tag);
        void showNotice({
          title: t("tabShopping"),
          body: t("notificationShopItem", { name: memberName(item.memberId), item: item.name }),
          tag,
          tab: "shopping",
        });
      }
    } else {
      itemIds.current = new Set(group.items.map((item) => item.id));
    }

    if (notify.calendar) {
      for (const event of group.events) {
        if (eventIds.current.has(event.id)) continue;
        eventIds.current.add(event.id);
        if (event.memberId === me || event.sourceId) continue;
        const tag = `newevent:${event.id}`;
        if (wasNotified(tag)) continue;
        markNotified(tag);
        void showNotice({
          title: t("tabCalendar"),
          body: t("notificationNewEvent", { name: memberName(event.memberId), title: event.title }),
          tag,
          tab: "calendar",
        });
      }
    } else {
      eventIds.current = new Set(group.events.map((event) => event.id));
    }

    if (notify.dinner) {
      for (const dinner of group.dinners) {
        const previous = dinnerStamp.current.get(dinner.id);
        dinnerStamp.current.set(dinner.id, dinner.title);
        if (previous === dinner.title) continue;
        if (dinner.memberId === me) continue;
        const tag = `dinner:${dinner.id}:${dinner.title}`;
        if (wasNotified(tag)) continue;
        markNotified(tag);
        void showNotice({
          title: t("tabDinner"),
          body: t("notificationDinner", { name: memberName(dinner.memberId), title: dinner.title }),
          tag,
          tab: "dinner",
        });
      }
    } else {
      dinnerStamp.current = new Map(group.dinners.map((dinner) => [dinner.id, dinner.title]));
    }

    if (notify.wishlist) {
      for (const list of group.wishlists) {
        const isNewList = !wishListIds.current.has(list.id);
        wishListIds.current.add(list.id);
        if (isNewList && list.memberId !== me) {
          const tag = `wishlist:${list.id}`;
          if (!wasNotified(tag)) {
            markNotified(tag);
            void showNotice({
              title: t("tabWishlist"),
              body: t("notificationWishList", { name: memberName(list.memberId), list: list.name }),
              tag,
              tab: "wishlist",
            });
          }
        }
        for (const item of list.items) {
          const key = `${list.id}:${item.id}`;
          if (wishItemIds.current.has(key)) continue;
          wishItemIds.current.add(key);
          if (item.memberId === me) continue;
          const tag = `wishitem:${key}`;
          if (wasNotified(tag)) continue;
          markNotified(tag);
          void showNotice({
            title: t("tabWishlist"),
            body: t("notificationWishItem", { name: memberName(item.memberId), item: item.name, list: list.name }),
            tag,
            tab: "wishlist",
          });
        }
      }
    } else {
      wishListIds.current = new Set(group.wishlists.map((list) => list.id));
      wishItemIds.current = new Set(group.wishlists.flatMap((list) => list.items.map((item) => `${list.id}:${item.id}`)));
    }
  }, [group, notify, session, t]);

  useEffect(() => {
    if (!notify.calendar || !group) return;

    const tick = () => {
      for (const event of group.events) {
        if (!reminderWindow(event)) continue;
        const tag = reminderTag(event);
        if (wasNotified(tag)) continue;
        markNotified(tag);
        const title = event.title.trim() || t("tabCalendar");
        const body = event.start
          ? t("notificationEventSoon", { title, time: formatTime(event.start, language) })
          : t("notificationAllDay", { title });
        void showNotice({ title, body, tag, tab: "calendar" });
      }
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [group, language, notify.calendar, t]);

  return null;
}
