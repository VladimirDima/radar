import { getDb } from "./db";
import type {
  AccountRow,
  ItemListView,
  ItemView,
  RunRow,
} from "./types";

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const ITEM_SELECT = `
  SELECT
    i.*,
    a.username AS username,
    p.permalink AS permalink,
    p.image_file AS image_file,
    p.caption AS caption
  FROM items i
  JOIN posts p ON p.id = i.post_id
  JOIN watched_accounts a ON a.id = p.account_id
`;

export function listItems(view: ItemListView): ItemView[] {
  const db = getDb();
  const today = todayIsoDate();

  let sql: string;
  switch (view) {
    case "feed":
      sql = `${ITEM_SELECT}
        WHERE i.dismissed = 0
          AND (i.starts_at IS NOT NULL OR i.deadline IS NOT NULL)
          AND COALESCE(substr(i.ends_at, 1, 10), substr(i.starts_at, 1, 10), substr(i.deadline, 1, 10)) >= ?
        ORDER BY i.discovered_at DESC
        LIMIT 500`;
      return db.prepare(sql).all(today) as ItemView[];

    case "undated":
      sql = `${ITEM_SELECT}
        WHERE i.dismissed = 0
          AND i.starts_at IS NULL
          AND i.deadline IS NULL
        ORDER BY i.discovered_at DESC
        LIMIT 500`;
      return db.prepare(sql).all() as ItemView[];

    case "starred":
      sql = `${ITEM_SELECT}
        WHERE i.starred = 1
        ORDER BY i.discovered_at DESC
        LIMIT 500`;
      return db.prepare(sql).all() as ItemView[];

    case "archive":
      sql = `${ITEM_SELECT}
        WHERE i.dismissed = 0
          AND (i.starts_at IS NOT NULL OR i.deadline IS NOT NULL)
          AND COALESCE(substr(i.ends_at, 1, 10), substr(i.starts_at, 1, 10), substr(i.deadline, 1, 10)) < ?
        ORDER BY COALESCE(i.ends_at, i.deadline, i.starts_at) DESC
        LIMIT 500`;
      return db.prepare(sql).all(today) as ItemView[];
  }
}

export function getItem(id: number): ItemView | undefined {
  const db = getDb();
  return db
    .prepare(`${ITEM_SELECT} WHERE i.id = ?`)
    .get(id) as ItemView | undefined;
}

export function listAccounts(): AccountRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM watched_accounts
       ORDER BY enabled DESC, username ASC`,
    )
    .all() as AccountRow[];
}

export function lastRun(): RunRow | undefined {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM runs ORDER BY id DESC LIMIT 1`)
    .get() as RunRow | undefined;
}

export function unseenCount(): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM items WHERE seen = 0 AND dismissed = 0`,
    )
    .get() as { n: number };
  return row.n;
}
