import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { imagesDir } from "./paths";

/** Minimal valid JPEG for demo covers. */
const TINY_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x08, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
  0x7f, 0xbf, 0xff, 0xd9,
]);

function daysFromNow(days: number, time?: string): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const date = d.toISOString().slice(0, 10);
  return time ? `${date}T${time}` : date;
}

function writeDemoImage(name: string): string {
  const file = `${name}.jpg`;
  const full = path.join(imagesDir(), file);
  if (!fs.existsSync(full)) fs.writeFileSync(full, TINY_JPEG);
  return file;
}

/** True when this DB was filled by the sample seed (for the UI banner). */
export function isDemoData(db: Database.Database): boolean {
  db.exec(`
    CREATE TABLE IF NOT EXISTS radar_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  const row = db
    .prepare(`SELECT value FROM radar_meta WHERE key = 'demo'`)
    .get() as { value: string } | undefined;
  return row?.value === "1";
}

/**
 * Populate sample accounts/items when the DB has no items.
 * Set RADAR_DEMO=0 to skip (e.g. on your Mac before the first real scrape).
 */
export function seedDemoIfNeeded(db: Database.Database): void {
  if (process.env.RADAR_DEMO === "0") return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS radar_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const row = db.prepare(`SELECT COUNT(*) AS n FROM items`).get() as {
    n: number;
  };
  if (row.n > 0) return;

  const insertAccount = db.prepare(`
    INSERT INTO watched_accounts (username, full_name, enabled, tag, last_post_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertPost = db.prepare(`
    INSERT INTO posts (
      account_id, external_id, permalink, caption, image_file, posted_at, extracted_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const insertItem = db.prepare(`
    INSERT INTO items (
      post_id, kind, category, title, summary,
      starts_at, ends_at, deadline, venue, city, price, link,
      seen, starred, dismissed, discovered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const accounts = [
      { username: "keramiklab_cph", full_name: "Keramik Lab", tag: "craft", img: "demo-clay" },
      { username: "jazzhouse_dk", full_name: "Jazzhouse", tag: "music", img: "demo-jazz" },
      { username: "kunsthal_charlottenborg", full_name: "Kunsthal Charlottenborg", tag: "art", img: "demo-art" },
      { username: "cph_opencalls", full_name: "CPH Open Calls", tag: "jobs", img: "demo-call" },
      { username: "torvehallerne", full_name: "Torvehallerne", tag: "food", img: "demo-market" },
    ] as const;

    const accountIds: number[] = [];
    for (const a of accounts) {
      writeDemoImage(a.img);
      const info = insertAccount.run(
        a.username,
        a.full_name,
        1,
        a.tag,
        Math.floor(Date.now() / 1000) - 86400,
      );
      accountIds.push(Number(info.lastInsertRowid));
    }

    type DemoItem = {
      account: number;
      shortcode: string;
      caption: string;
      image: string;
      kind: "event" | "opportunity";
      category: string;
      title: string;
      summary: string;
      starts_at: string | null;
      ends_at: string | null;
      deadline: string | null;
      venue: string | null;
      city: string | null;
      price: string | null;
      link: string | null;
      seen: number;
      starred: number;
      dismissed: number;
      discovered_offset_hours: number;
    };

    const demos: DemoItem[] = [
      {
        account: 0,
        shortcode: "demo-clay",
        caption: "Handbuilding workshop Saturday!",
        image: "demo-clay.jpg",
        kind: "event",
        category: "workshop",
        title: "Handbuilding clay workshop",
        summary:
          "Beginner-friendly ceramic session focused on coil and slab techniques.",
        starts_at: daysFromNow(3, "10:00"),
        ends_at: daysFromNow(3, "13:00"),
        deadline: null,
        venue: "Keramik Lab",
        city: "Copenhagen",
        price: "450 DKK",
        link: "https://example.com/clay",
        seen: 0,
        starred: 0,
        dismissed: 0,
        discovered_offset_hours: 2,
      },
      {
        account: 1,
        shortcode: "demo-jazz",
        caption: "Friday night trio",
        image: "demo-jazz.jpg",
        kind: "event",
        category: "concert",
        title: "Friday night jazz trio",
        summary: "An evening of contemporary jazz in the main room.",
        starts_at: daysFromNow(5, "20:00"),
        ends_at: null,
        deadline: null,
        venue: "Jazzhouse",
        city: "Copenhagen",
        price: "180 DKK",
        link: null,
        seen: 0,
        starred: 1,
        dismissed: 0,
        discovered_offset_hours: 5,
      },
      {
        account: 2,
        shortcode: "demo-art",
        caption: "Opening Thursday",
        image: "demo-art.jpg",
        kind: "event",
        category: "art_opening",
        title: "New Nordic photography opening",
        summary: "Exhibition opening with a short curator talk at 17:00.",
        starts_at: daysFromNow(2, "17:00"),
        ends_at: daysFromNow(45),
        deadline: null,
        venue: "Kunsthal Charlottenborg",
        city: "Copenhagen",
        price: "Free",
        link: "https://example.com/opening",
        seen: 0,
        starred: 0,
        dismissed: 0,
        discovered_offset_hours: 8,
      },
      {
        account: 3,
        shortcode: "demo-call",
        caption: "Residency open call",
        image: "demo-call.jpg",
        kind: "opportunity",
        category: "open_call",
        title: "Three-month studio residency",
        summary:
          "Open call for artists working with ceramics or textiles. Portfolio PDF required.",
        starts_at: null,
        ends_at: null,
        deadline: daysFromNow(21),
        venue: null,
        city: "Copenhagen",
        price: null,
        link: "https://example.com/residency",
        seen: 0,
        starred: 1,
        dismissed: 0,
        discovered_offset_hours: 12,
      },
      {
        account: 3,
        shortcode: "demo-job",
        caption: "Gallery assistant",
        image: "demo-call.jpg",
        kind: "opportunity",
        category: "job",
        title: "Part-time gallery assistant",
        summary: "Weekend front-of-house role at a small contemporary gallery.",
        starts_at: null,
        ends_at: null,
        deadline: daysFromNow(10, "23:59"),
        venue: "Indre By gallery",
        city: "Copenhagen",
        price: null,
        link: null,
        seen: 1,
        starred: 0,
        dismissed: 0,
        discovered_offset_hours: 20,
      },
      {
        account: 4,
        shortcode: "demo-market",
        caption: "Weekend market",
        image: "demo-market.jpg",
        kind: "event",
        category: "market",
        title: "Weekend makers market",
        summary: "Food and craft stalls in the hall all weekend.",
        starts_at: daysFromNow(6),
        ends_at: daysFromNow(7),
        deadline: null,
        venue: "Torvehallerne",
        city: "Copenhagen",
        price: "Free entry",
        link: null,
        seen: 0,
        starred: 0,
        dismissed: 0,
        discovered_offset_hours: 30,
      },
      {
        account: 0,
        shortcode: "demo-undated",
        caption: "More workshops coming soon",
        image: "demo-clay.jpg",
        kind: "event",
        category: "workshop",
        title: "Glaze chemistry series (date TBA)",
        summary:
          "Multi-evening course on glaze materials; exact dates not stated in the post.",
        starts_at: null,
        ends_at: null,
        deadline: null,
        venue: "Keramik Lab",
        city: "Copenhagen",
        price: "TBA",
        link: null,
        seen: 0,
        starred: 0,
        dismissed: 0,
        discovered_offset_hours: 40,
      },
      {
        account: 1,
        shortcode: "demo-past",
        caption: "Last week's session",
        image: "demo-jazz.jpg",
        kind: "event",
        category: "talk",
        title: "Artist talk: sound and city",
        summary: "A conversation on field recording in urban spaces.",
        starts_at: daysFromNow(-12, "19:00"),
        ends_at: null,
        deadline: null,
        venue: "Jazzhouse",
        city: "Copenhagen",
        price: "Free",
        link: null,
        seen: 1,
        starred: 0,
        dismissed: 0,
        discovered_offset_hours: 100,
      },
      {
        account: 2,
        shortcode: "demo-party",
        caption: "Closing party",
        image: "demo-art.jpg",
        kind: "event",
        category: "party",
        title: "Exhibition closing party",
        summary: "DJ sets and drinks to mark the final weekend of the show.",
        starts_at: daysFromNow(14, "21:00"),
        ends_at: null,
        deadline: null,
        venue: "Kunsthal Charlottenborg",
        city: "Copenhagen",
        price: "80 DKK",
        link: null,
        seen: 0,
        starred: 0,
        dismissed: 0,
        discovered_offset_hours: 1,
      },
    ];

    for (const demo of demos) {
      const accountId = accountIds[demo.account];
      const postedAt = Math.floor(Date.now() / 1000) - demo.discovered_offset_hours * 3600;
      const postInfo = insertPost.run(
        accountId,
        demo.shortcode,
        `https://www.instagram.com/p/${demo.shortcode}/`,
        demo.caption,
        demo.image,
        postedAt,
      );
      const discovered = new Date(
        Date.now() - demo.discovered_offset_hours * 3600 * 1000,
      )
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);
      insertItem.run(
        Number(postInfo.lastInsertRowid),
        demo.kind,
        demo.category,
        demo.title,
        demo.summary,
        demo.starts_at,
        demo.ends_at,
        demo.deadline,
        demo.venue,
        demo.city,
        demo.price,
        demo.link,
        demo.seen,
        demo.starred,
        demo.dismissed,
        discovered,
      );
    }

    db.prepare(
      `INSERT INTO runs (
        status, finished_at, posts_fetched, items_created, tokens_in, tokens_out
      ) VALUES ('ok', datetime('now'), ?, ?, 1200, 400)`,
    ).run(demos.length, demos.length);

    db.prepare(
      `INSERT INTO radar_meta (key, value) VALUES ('demo', '1')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run();
  });

  tx();
}
