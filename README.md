# Radar

Local, single-user Next.js dashboard that surfaces **events** (especially workshops) and **opportunities** posted by Instagram accounts you follow — so you don't have to scroll the feed. Runs on your personal Mac.

See [CONTEXT.md](./CONTEXT.md) for the glossary (Source, Scout Account, Watched Account, Run, Post, Extraction, Item, Archive).

## Pipeline

```
launchd (07:30)
    → npm run radar
        → scrape Watched Account profiles (Playwright + Scout login)
        → extract items (vision LLM)
        → SQLite (data/radar.db)
            → Next.js UI (Feed / Undated / Starred / Archive / Watchlist)
```

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env   # set OPENAI_API_KEY (and optional Gemini base URL / model)
npm run login          # headed browser — log in with the Scout account
npm run import-following
npm run dev            # open http://localhost:3000/watchlist
```

On the watchlist: **Disable all**, then enable 20–30 accounts you care about. Then:

```bash
npm run radar
```

Daily schedule (macOS): copy `scripts/com.radar.daily.plist` to `~/Library/LaunchAgents/`, edit `/PATH/TO/radar`, then `launchctl load ~/Library/LaunchAgents/com.radar.daily.plist`.

## Scout Account warning

Scraping Instagram is against Instagram's Terms of Service. Use a **secondary Scout Account**, not your real login. Keep volume low (~30 profiles/day, 8–20 s apart). If Instagram shows a checkpoint/challenge, the run stops immediately and the header shows the error. Recover with:

```bash
RADAR_HEADED=1 npm run scrape
# or
npm run login
```

## Costs

About one vision call per new post. With `gpt-4o-mini` or Gemini Flash this is typically well under **$1/month** at low volume.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js UI |
| `npm run login` | Scout browser login |
| `npm run import-following` | Import Scout's following into watchlist |
| `npm run radar` | Full scrape + extract |
| `npm run scrape` | Scrape only |
| `npm run extract` | Extract only |
| `npm run typecheck` | `tsc --noEmit` |

## Adding sources

Implement `Source` from `src/lib/types.ts` (`fetchNew` writing into `posts` with a new `source` value). The extractor and UI stay the same. Structured sources may insert `items` directly.
