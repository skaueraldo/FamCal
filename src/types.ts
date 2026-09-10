export type Tab = "calendar" | "dinner" | "shopping" | "wishlist" | "group" | "settings";

export interface Member {
  id: string;
  name: string;
  color: string;
  admin?: boolean;
}

export interface CalEvent {
  id: string;
  title: string;
  date: string;
  start?: string;
  end?: string;
  notes?: string;
  memberId: string;
  sourceId?: string;
  uid?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  qty?: string;
  category?: string;
  done: boolean;
  memberId: string;
  createdAt: number;
}

export interface Source {
  id: string;
  name: string;
  kind: "ics-file" | "ics-url" | "spond";
  url?: string;
  email?: string;
  lastImported?: number;
}

export interface Dinner {
  id: string;
  weekStart: string;
  weekday: number;
  title: string;
  notes?: string;
  memberId: string;
}

export interface WishItem {
  id: string;
  name: string;
  memberId: string;
  createdAt: number;
}

export interface Wishlist {
  id: string;
  name: string;
  memberId: string;
  createdAt: number;
  items: WishItem[];
}

export interface Group {
  code: string;
  name: string;
  members: Member[];
  kickedIds?: string[];
  events: CalEvent[];
  items: ShopItem[];
  dinners: Dinner[];
  wishlists: Wishlist[];
  sources: Source[];
  updatedAt: number;
}

export interface Profile {
  id: string;
  name: string;
  color: string;
}

export interface Session {
  profile: Profile;
  groupCode: string;
}

export interface Membership {
  groupCode: string;
  groupName?: string;
  profile: Profile;
}

export interface Account {
  activeCode: string;
  memberships: Membership[];
}
