import {
  chromium,
  type BrowserContext,
  type Page,
} from "playwright";
import { scoutProfileDir } from "@/lib/paths";

export class CheckpointError extends Error {
  constructor(message = "Instagram checkpoint required") {
    super(message);
    this.name = "CheckpointError";
  }
}

export class RateLimitError extends Error {
  constructor(message = "Instagram rate limit") {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function openScout(
  headless = process.env.RADAR_HEADED !== "1",
): Promise<BrowserContext> {
  return chromium.launchPersistentContext(scoutProfileDir(), {
    headless,
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    timezoneId: "Europe/Copenhagen",
  });
}

export async function scoutUserId(ctx: BrowserContext): Promise<string> {
  const cookies = await ctx.cookies();
  const cookie = cookies.find((c) => c.name === "ds_user_id");
  if (!cookie?.value) {
    throw new CheckpointError("Not logged in — missing ds_user_id cookie");
  }
  return cookie.value;
}

export async function igPage(ctx: BrowserContext): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto("https://www.instagram.com/", {
    waitUntil: "domcontentloaded",
  });
  const url = page.url();
  if (url.includes("/accounts/login") || url.includes("/challenge")) {
    await page.close();
    throw new CheckpointError(`Redirected to ${url}`);
  }
  return page;
}

export async function igGet<T>(page: Page, url: string): Promise<T> {
  const result = await page.evaluate(
    async ({ url, appId }) => {
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          "x-ig-app-id": appId,
          "x-requested-with": "XMLHttpRequest",
        },
      });
      const text = await res.text();
      return {
        status: res.status,
        url: res.url,
        text,
      };
    },
    { url, appId: "936619743392459" },
  );

  if (result.status === 401 || result.status === 403) {
    throw new CheckpointError(`HTTP ${result.status} for ${url}`);
  }
  if (result.status === 429) {
    throw new RateLimitError(`HTTP 429 for ${url}`);
  }
  if (result.url.includes("/challenge") || result.text.includes("checkpoint_required")) {
    throw new CheckpointError(`Checkpoint required for ${url}`);
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`HTTP ${result.status} for ${url}: ${result.text.slice(0, 200)}`);
  }

  return JSON.parse(result.text) as T;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jitter(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return sleep(ms);
}
