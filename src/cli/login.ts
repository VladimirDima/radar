import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { openScout, scoutUserId } from "@/scraper/browser";

async function main(): Promise<void> {
  const ctx = await openScout(false);
  const page = await ctx.newPage();
  await page.goto("https://www.instagram.com/accounts/login/", {
    waitUntil: "domcontentloaded",
  });

  console.log(
    "Log in with the Scout account in the browser (including 2FA if needed).",
  );
  console.log("When done, press Enter here.");

  const rl = readline.createInterface({ input, output });
  await rl.question("");
  rl.close();

  try {
    const userId = await scoutUserId(ctx);
    console.log(`Logged in. ds_user_id=${userId}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    await ctx.close();
    process.exit(1);
  }

  await ctx.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
