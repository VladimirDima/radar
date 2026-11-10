import "dotenv/config";
import { openScout } from "@/scraper/browser";
import { importFollowing } from "@/scraper/following";

async function main(): Promise<void> {
  const ctx = await openScout();
  try {
    const { total, added } = await importFollowing(ctx);
    console.log(`Following: ${total} total, ${added} newly added.`);
    console.log("Prune the watchlist at /watchlist (Disable all, then enable 20–30).");
  } finally {
    await ctx.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
