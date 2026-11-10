import fs from "node:fs";
import path from "node:path";
import type { BrowserContext, Page } from "playwright";
import { getDb } from "@/lib/db";
import { imagesDir } from "@/lib/paths";
import type { AccountRow, RunStats, Source } from "@/lib/types";
import {
  CheckpointError,
  RateLimitError,
  igGet,
  igPage,
  jitter,
  openScout,
} from "./browser";

interface IgCaptionEdge {
  node: { text: string };
}

interface IgMediaNode {
  shortcode: string;
  taken_at_timestamp: number;
  display_url: string;
  edge_media_to_caption: { edges: IgCaptionEdge[] };
}

interface WebProfileInfo {
  data: {
    user: {
      id: string;
      full_name: string;
      edge_owner_to_timeline_media: {
        edges: Array<{ node: IgMediaNode }>;
      };
    };
  };
}

function firstRunCutoff(): number {
  const days = Number(process.env.RADAR_FIRST_RUN_DAYS || "30");
  const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
  return Math.floor(Date.now() / 1000) - safeDays * 24 * 60 * 60;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function downloadImage(
  page: Page,
  url: string,
  shortcode: string,
): Promise<string | null> {
  try {
    const res = await page.evaluate(async (imageUrl) => {
      const r = await fetch(imageUrl, { credentials: "include" });
      if (!r.ok) return null;
      const buf = await r.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buf));
      return bytes;
    }, url);
    if (!res) return null;
    const file = `${shortcode}.jpg`;
    fs.writeFileSync(path.join(imagesDir(), file), Buffer.from(res));
    return file;
  } catch {
    return null;
  }
}

export class InstagramSource implements Source {
  name = "instagram";
  private ctx: BrowserContext | null = null;
  private page: Page | null = null;

  async open(): Promise<void> {
    this.ctx = await openScout();
    this.page = await igPage(this.ctx);
  }

  async close(): Promise<void> {
    await this.page?.close().catch(() => undefined);
    await this.ctx?.close().catch(() => undefined);
    this.page = null;
    this.ctx = null;
  }

  async fetchNew(stats: RunStats): Promise<number> {
    if (!this.page) {
      throw new Error("InstagramSource not opened");
    }
    const page = this.page;
    const db = getDb();
    const accounts = db
      .prepare(`SELECT * FROM watched_accounts WHERE enabled = 1`)
      .all() as AccountRow[];

    const ordered = shuffle(accounts);
    let fetched = 0;

    for (let i = 0; i < ordered.length; i++) {
      const account = ordered[i];
      try {
        const data = await igGet<WebProfileInfo>(
          page,
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(account.username)}`,
        );
        const user = data.data.user;
        const cutoff = account.last_post_at ?? firstRunCutoff();
        const edges = user.edge_owner_to_timeline_media?.edges ?? [];
        let maxPostedAt = account.last_post_at ?? 0;

        const insert = db.prepare(`
          INSERT OR IGNORE INTO posts (
            source, account_id, external_id, permalink, caption, image_file, posted_at
          ) VALUES ('instagram', ?, ?, ?, ?, ?, ?)
        `);

        for (const { node } of edges) {
          if (node.taken_at_timestamp <= cutoff) continue;
          const imageFile = await downloadImage(
            page,
            node.display_url,
            node.shortcode,
          );
          const caption =
            node.edge_media_to_caption?.edges?.[0]?.node?.text ?? null;
          const info = insert.run(
            account.id,
            node.shortcode,
            `https://www.instagram.com/p/${node.shortcode}/`,
            caption,
            imageFile,
            node.taken_at_timestamp,
          );
          if (info.changes > 0) {
            fetched += 1;
            stats.postsFetched += 1;
          }
          if (node.taken_at_timestamp > maxPostedAt) {
            maxPostedAt = node.taken_at_timestamp;
          }
        }

        db.prepare(
          `UPDATE watched_accounts
           SET ig_user_id = ?, full_name = ?, last_post_at = ?, last_error = NULL
           WHERE id = ?`,
        ).run(user.id, user.full_name, maxPostedAt || account.last_post_at, account.id);
      } catch (err) {
        if (err instanceof CheckpointError || err instanceof RateLimitError) {
          throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        db.prepare(
          `UPDATE watched_accounts SET last_error = ? WHERE id = ?`,
        ).run(message.slice(0, 500), account.id);
      }

      if (i < ordered.length - 1) {
        await jitter(8000, 20000);
      }
    }

    return fetched;
  }
}
