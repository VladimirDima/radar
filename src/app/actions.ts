"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";

const ITEM_FLAGS = new Set(["seen", "starred", "dismissed"] as const);
type ItemFlag = "seen" | "starred" | "dismissed";

function revalidateItemViews(): void {
  revalidatePath("/");
  revalidatePath("/undated");
  revalidatePath("/starred");
  revalidatePath("/archive");
  revalidatePath("/watchlist");
}

export async function setItemFlag(
  id: number,
  flag: string,
  value: number,
): Promise<void> {
  if (!ITEM_FLAGS.has(flag as ItemFlag)) {
    throw new Error(`Invalid flag: ${flag}`);
  }
  const v = value ? 1 : 0;
  const db = getDb();
  db.prepare(`UPDATE items SET ${flag} = ? WHERE id = ?`).run(v, id);
  revalidateItemViews();
}

export async function markAllSeen(): Promise<void> {
  const db = getDb();
  db.prepare(
    `UPDATE items SET seen = 1 WHERE seen = 0 AND dismissed = 0`,
  ).run();
  revalidateItemViews();
}

export async function setAccountEnabled(
  id: number,
  enabled: number,
): Promise<void> {
  const db = getDb();
  db.prepare(`UPDATE watched_accounts SET enabled = ? WHERE id = ?`).run(
    enabled ? 1 : 0,
    id,
  );
  revalidatePath("/watchlist");
}

export async function setAllAccountsEnabled(enabled: number): Promise<void> {
  const db = getDb();
  db.prepare(`UPDATE watched_accounts SET enabled = ?`).run(enabled ? 1 : 0);
  revalidatePath("/watchlist");
}

export async function setAccountTag(
  id: number,
  tag: string,
): Promise<void> {
  const trimmed = tag.trim();
  const db = getDb();
  db.prepare(`UPDATE watched_accounts SET tag = ? WHERE id = ?`).run(
    trimmed.length ? trimmed : null,
    id,
  );
  revalidatePath("/watchlist");
}
