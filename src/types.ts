export type Tab = "calendar" | "dinner" | "shopping" | "todos" | "spendings" | "wishlist" | "group" | "settings";

export interface Member {
  id: string;
  name: string;
  color: string;
  admin?: boolean;
  menu?: Partial<Record<Exclude<Tab, "settings">, boolean>>;
}

export type RepeatRule = "daily" | "weekly" | "monthly" | "yearly";

export interface CalEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  start?: string;
  end?: string;
  notes?: string;
  memberId: string;
  color?: string;
  repeat?: RepeatRule;
  repeatUntil?: string;
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

export interface ShopHistoryEntry {
  name: string;
  qty?: string;
  lastUsed: number;
  uses: number;
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

export interface TodoItem {
  id: string;
  name: string;
  done: boolean;
  memberId: string;
  createdAt: number;
}

export interface TodoList {
  id: string;
  name: string;
  memberId: string;
  createdAt: number;
  items: TodoItem[];
}

export interface SpendItem {
  id: string;
  date: string;
  name: string;
  cost: number;
  memberId: string;
  spenderName: string;
  createdAt: number;
}

export interface SpendList {
  id: string;
  name: string;
  memberId: string;
  createdAt: number;
  items: SpendItem[];
}

export interface Group {
  code: string;
  name: string;
  members: Member[];
  kickedIds?: string[];
  events: CalEvent[];
  items: ShopItem[];
  shopHistory: ShopHistoryEntry[];
  dinners: Dinner[];
  wishlists: Wishlist[];
  todos: TodoList[];
  spendings: SpendList[];
  sources: Source[];
  createdAt?: number;
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
