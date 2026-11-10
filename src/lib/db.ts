import Database from "better-sqlite3";
import { dbPath } from "./paths";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const instance = new Database(dbPath());
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");

  instance.exec(`
    CREATE TABLE IF NOT EXISTS watched_accounts (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      ig_user_id TEXT,
      full_name TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      tag TEXT,
      last_post_at INTEGER,
      last_error TEXT,
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'instagram',
      account_id INTEGER NOT NULL REFERENCES watched_accounts(id),
      external_id TEXT NOT NULL,
      permalink TEXT NOT NULL,
      caption TEXT,
      image_file TEXT,
      posted_at INTEGER NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      extracted_at TEXT,
      extract_error TEXT,
      UNIQUE(source, external_id)
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id),
      kind TEXT NOT NULL CHECK (kind IN ('event', 'opportunity')),
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      starts_at TEXT,
      ends_at TEXT,
      deadline TEXT,
      venue TEXT,
      city TEXT,
      price TEXT,
      link TEXT,
      discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
      seen INTEGER NOT NULL DEFAULT 0,
      starred INTEGER NOT NULL DEFAULT 0,
      dismissed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'error')),
      posts_fetched INTEGER,
      items_created INTEGER,
      tokens_in INTEGER,
      tokens_out INTEGER,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_items_discovered_at ON items(discovered_at);
    CREATE INDEX IF NOT EXISTS idx_posts_extracted_at ON posts(extracted_at);
  `);

  db = instance;
  return instance;
}
