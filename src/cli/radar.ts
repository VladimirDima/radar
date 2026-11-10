import "dotenv/config";
import { getDb } from "@/lib/db";
import type { RunStats } from "@/lib/types";
import { extractPending } from "@/extractor/extract";
import { InstagramSource } from "@/scraper/instagram";

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const scrapeOnly = args.has("--scrape-only");
  const extractOnly = args.has("--extract-only");

  const db = getDb();
  const stats: RunStats = {
    postsFetched: 0,
    itemsCreated: 0,
    tokensIn: 0,
    tokensOut: 0,
  };

  const run = db
    .prepare(`INSERT INTO runs (status) VALUES ('running')`)
    .run();
  const runId = Number(run.lastInsertRowid);

  let errorMessage: string | null = null;

  try {
    if (!extractOnly) {
      const source = new InstagramSource();
      try {
        await source.open();
        await source.fetchNew(stats);
      } finally {
        await source.close();
      }
    }

    if (!scrapeOnly) {
      await extractPending(stats);
    }

    db.prepare(
      `UPDATE runs SET
        finished_at = datetime('now'),
        status = 'ok',
        posts_fetched = ?,
        items_created = ?,
        tokens_in = ?,
        tokens_out = ?,
        error = NULL
       WHERE id = ?`,
    ).run(
      stats.postsFetched,
      stats.itemsCreated,
      stats.tokensIn,
      stats.tokensOut,
      runId,
    );
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    db.prepare(
      `UPDATE runs SET
        finished_at = datetime('now'),
        status = 'error',
        posts_fetched = ?,
        items_created = ?,
        tokens_in = ?,
        tokens_out = ?,
        error = ?
       WHERE id = ?`,
    ).run(
      stats.postsFetched,
      stats.itemsCreated,
      stats.tokensIn,
      stats.tokensOut,
      errorMessage.slice(0, 2000),
      runId,
    );
  }

  console.log(
    `${stats.postsFetched} posts, ${stats.itemsCreated} items, ${stats.tokensIn}/${stats.tokensOut} tokens`,
  );

  if (errorMessage) {
    console.error(errorMessage);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
