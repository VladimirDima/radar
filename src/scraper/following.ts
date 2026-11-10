import type { BrowserContext } from "playwright";
import { getDb } from "@/lib/db";
import { igGet, igPage, jitter, scoutUserId } from "./browser";

interface FollowingUser {
  pk: string | number;
  username: string;
  full_name: string;
}

interface FollowingResponse {
  users: FollowingUser[];
  next_max_id?: string | null;
}

/** Import everyone the Scout follows into watched_accounts. Keeps existing enabled/tag. */
export async function importFollowing(
  ctx: BrowserContext,
): Promise<{ total: number; added: number }> {
  const userId = await scoutUserId(ctx);
  const page = await igPage(ctx);
  const db = getDb();

  const existsStmt = db.prepare(
    `SELECT id FROM watched_accounts WHERE username = ?`,
  );
  const insertStmt = db.prepare(`
    INSERT INTO watched_accounts (username, ig_user_id, full_name, enabled)
    VALUES (?, ?, ?, 1)
  `);
  const updateStmt = db.prepare(`
    UPDATE watched_accounts
    SET ig_user_id = ?, full_name = ?
    WHERE username = ?
  `);

  let cursor: string | undefined;
  let total = 0;
  let added = 0;

  try {
    do {
      const qs = new URLSearchParams({ count: "50" });
      if (cursor) qs.set("max_id", cursor);
      const url = `https://www.instagram.com/api/v1/friendships/${userId}/following/?${qs.toString()}`;
      const data = await igGet<FollowingResponse>(page, url);

      for (const user of data.users ?? []) {
        total += 1;
        const existing = existsStmt.get(user.username) as
          | { id: number }
          | undefined;
        if (existing) {
          updateStmt.run(
            String(user.pk),
            user.full_name || null,
            user.username,
          );
        } else {
          insertStmt.run(
            user.username,
            String(user.pk),
            user.full_name || null,
          );
          added += 1;
        }
      }

      cursor = data.next_max_id || undefined;
      if (cursor) await jitter(2000, 5000);
    } while (cursor);
  } finally {
    await page.close().catch(() => undefined);
  }

  return { total, added };
}
