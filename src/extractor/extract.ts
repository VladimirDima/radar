import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { imagesDir } from "@/lib/paths";
import { CATEGORIES, type RunStats } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

const ExtractedItemSchema = z.object({
  kind: z.enum(["event", "opportunity"]),
  category: z.enum(CATEGORIES),
  title: z.string(),
  summary: z.string(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  deadline: z.string().nullable(),
  venue: z.string().nullable(),
  city: z.string().nullable(),
  price: z.string().nullable(),
  link: z.string().nullable(),
});

const ExtractionSchema = z.object({
  items: z.array(ExtractedItemSchema),
});

const SYSTEM_PROMPT = `You extract things the user could attend or apply to from Instagram posts.

kind "event" = has a date and usually a place (workshop, concert, art opening/exhibition, talk/lecture, market/pop-up, party/club night).
kind "opportunity" = has a deadline (job, open call, residency).

Return an empty items list for brand content, recaps of past events, memes, or anything not attendable/applyable.
Posts may be Danish or other languages; write title and summary in English.
Use only dates stated in the caption or image; never invent dates.
If a year is missing, infer the next occurrence on or after the publish date.
Dates must be YYYY-MM-DD or YYYY-MM-DDTHH:mm.`;

interface PendingPost {
  id: number;
  caption: string | null;
  image_file: string | null;
  posted_at: number;
  username: string;
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t.length ? t : null;
}

function validDate(value: string | null): string | null {
  if (!value) return null;
  const t = value.trim();
  return DATE_RE.test(t) ? t : null;
}

function todayLabel(): string {
  return new Date().toISOString().slice(0, 10);
}

function publishedLabel(postedAt: number): string {
  return new Date(postedAt * 1000).toISOString().slice(0, 10);
}

export async function extractPending(stats: RunStats): Promise<number> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for extraction");
  }

  const client = new OpenAI({
    apiKey,
    ...(process.env.OPENAI_BASE_URL
      ? { baseURL: process.env.OPENAI_BASE_URL }
      : {}),
  });
  const model = process.env.RADAR_MODEL || "gpt-4o-mini";
  const db = getDb();

  const posts = db
    .prepare(
      `SELECT p.id, p.caption, p.image_file, p.posted_at, a.username
       FROM posts p
       JOIN watched_accounts a ON a.id = p.account_id
       WHERE p.extracted_at IS NULL
       ORDER BY p.posted_at ASC`,
    )
    .all() as PendingPost[];

  let created = 0;

  const insertItem = db.prepare(`
    INSERT INTO items (
      post_id, kind, category, title, summary,
      starts_at, ends_at, deadline, venue, city, price, link
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const markOk = db.prepare(
    `UPDATE posts SET extracted_at = datetime('now'), extract_error = NULL WHERE id = ?`,
  );
  const markErr = db.prepare(
    `UPDATE posts SET extract_error = ? WHERE id = ?`,
  );

  for (const post of posts) {
    try {
      const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: "text",
          text: [
            `Today: ${todayLabel()}`,
            `Account: @${post.username}`,
            `Published: ${publishedLabel(post.posted_at)}`,
            `Caption: ${post.caption ?? "(none)"}`,
          ].join("\n"),
        },
      ];

      if (post.image_file) {
        const imagePath = path.join(imagesDir(), post.image_file);
        if (fs.existsSync(imagePath)) {
          const b64 = fs.readFileSync(imagePath).toString("base64");
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${b64}`,
              detail: "high",
            },
          });
        }
      }

      const completion = await client.chat.completions.parse({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: zodResponseFormat(ExtractionSchema, "extraction"),
      });

      const usage = completion.usage;
      if (usage) {
        stats.tokensIn += usage.prompt_tokens ?? 0;
        stats.tokensOut += usage.completion_tokens ?? 0;
      }

      const parsed = completion.choices[0]?.message?.parsed;
      const items = parsed?.items ?? [];

      const tx = db.transaction(() => {
        for (const raw of items) {
          const title = raw.title.trim();
          const summary = raw.summary.trim();
          if (!title || !summary) continue;
          insertItem.run(
            post.id,
            raw.kind,
            raw.category,
            title,
            summary,
            validDate(raw.starts_at),
            validDate(raw.ends_at),
            validDate(raw.deadline),
            trimOrNull(raw.venue),
            trimOrNull(raw.city),
            trimOrNull(raw.price),
            trimOrNull(raw.link),
          );
          created += 1;
          stats.itemsCreated += 1;
        }
        markOk.run(post.id);
      });
      tx();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      markErr.run(message.slice(0, 1000), post.id);
    }
  }

  return created;
}
