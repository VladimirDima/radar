# Radar — context & glossary

Local, single-user Next.js dashboard that surfaces events (especially workshops) and opportunities posted by Instagram accounts you follow, so you don't have to scroll the feed. Runs on a personal Mac.

## Glossary

- **Source**: channel content comes from. v1 = Instagram; later: news RSS, Facebook events, Spotify-followed artists' concerts (Bandsintown/Songkick).
- **Scout Account**: a secondary Instagram login the scraper uses, to isolate ban risk from your real account.
- **Watched Account**: an IG account on the watchlist; imported from everything the Scout follows, then pruned by you.
- **Run**: one daily scrape+extract.
- **Post**: raw IG feed post (caption + image), stored once, never re-extracted.
- **Extraction**: a vision LLM reads caption + poster image → zero or more Items.
- **Item**: an Event (date + place; workshop, concert, art opening, talk, market, party) or an Opportunity (deadline; job, open call, residency). **Undated** = item with no date/deadline found.
- Item state: new → seen; flags starred, dismissed. **Archive** = events/opportunities whose date/deadline passed.

## Decisions (v1)

- Scrape each Watched Account's profile (not the home feed, which is algorithmically ranked).
- Feed posts only — no Stories/Reels.
- No location filter.
- Newest-discovered first.
- No dedup and no learning from dismissals.
