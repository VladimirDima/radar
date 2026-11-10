export const CATEGORIES = [
  "workshop",
  "concert",
  "art_opening",
  "talk",
  "market",
  "party",
  "job",
  "open_call",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ItemKind = "event" | "opportunity";

export interface ItemRow {
  id: number;
  post_id: number;
  kind: ItemKind;
  category: Category;
  title: string;
  summary: string;
  starts_at: string | null;
  ends_at: string | null;
  deadline: string | null;
  venue: string | null;
  city: string | null;
  price: string | null;
  link: string | null;
  discovered_at: string;
  seen: number;
  starred: number;
  dismissed: number;
}

export interface ItemView extends ItemRow {
  username: string;
  permalink: string;
  image_file: string | null;
  caption: string | null;
}

export interface AccountRow {
  id: number;
  username: string;
  ig_user_id: string | null;
  full_name: string | null;
  enabled: number;
  tag: string | null;
  last_post_at: number | null;
  last_error: string | null;
  added_at: string;
}

export interface RunRow {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "error";
  posts_fetched: number | null;
  items_created: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  error: string | null;
}

export interface RunStats {
  postsFetched: number;
  itemsCreated: number;
  tokensIn: number;
  tokensOut: number;
}

export type ItemListView = "feed" | "undated" | "starred" | "archive";

export interface Source {
  name: string;
  fetchNew(stats: RunStats): Promise<number>;
}
