# FlickPick

Movie & TV finder that filters TMDB discover results by media type, genre(s), rating(s) (MPAA or TV), decade(s), and US streaming providers, then sorts/filters by score.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**
- **Tailwind CSS v4** for base tooling; custom CSS for the cinematic UI
- **TMDB API** for discover/search (movies + TV), genres, certifications, watch providers
- **OMDb API** (optional) for live IMDb ratings

## Why this stack

Short-term: fast local UI with server-side API proxying so keys stay off the client.  
Long-term: easy to add auth, watchlists, or a thicker data layer without rewriting the filter UX.

## Setup

1. Copy `.env.example` → `.env.local`
2. Add `TMDB_API_KEY` from [TMDB API settings](https://www.themoviedb.org/settings/api)
3. Optional: add `OMDB_API_KEY` from [OMDb](https://www.omdbapi.com/apikey.aspx) for IMDb scores
4. `npm install && npm run dev`

Without `TMDB_API_KEY`, the app runs in **demo mode** with curated movie and TV samples so the UI is still usable.

## Architecture

| Piece | Role |
| --- | --- |
| `src/app/api/movies/route.ts` | Proxies filter params → TMDB (+ OMDb enrichment) |
| `src/app/api/title/route.ts` | Title detail payload (credits, watch offers, TV/movie facts) |
| `src/app/title/[mediaType]/[id]/page.tsx` | Detail page |
| `src/lib/tmdb.ts` | Discover/search for movie or TV, decade/provider/cert mapping, score sort |
| `src/lib/title-detail.ts` | Detail fetch, season watch best-effort, credit mapping |
| `src/components/FlickPickApp.tsx` | Client state, debounced search, endless scroll |
| `src/components/Filters.tsx` | Type toggle, checkbox dropdowns, min score, sort |

### Media type

- **Movies** use MPAA ratings (G–NR) and movie genre IDs; dates use `primary_release_date`.
- **TV** uses US TV ratings (TV-Y–TV-MA) and TV genre IDs; dates use `first_air_date`.
- Switching type clears genre and rating selections (different ID/rating spaces).

### Score handling

- TMDB `vote_average` drives discover `vote_average.gte` and default ranking when OMDb is absent.
- With `OMDB_API_KEY`, each result’s IMDb id is resolved via TMDB external ids, then OMDb supplies `imdbRating`.
- Client-side re-sort for `imdb.desc` / `imdb.asc` and a final min-score pass after enrichment.
- Score badges link to the IMDb title page when an id is available.

### Streaming filter

Uses TMDB `with_watch_providers` + `watch_region=US` + monetization types (`flatrate`, or `free|ads` when Free streaming is selected) for Netflix, Prime, Disney+, HBO Max, Hulu, Apple TV+, Paramount+, Peacock, BritBox, Starz, AMC+, MGM+, Criterion, Crunchyroll, plus free/ad services (Tubi, Pluto, Freevee, Roku, Plex, Crackle).

Movie cards also show US flatrate providers from TMDB `watch/providers` (up to four labels under year / rating / genre).

### Title detail (`/title/{movie|tv}/{id}`)

Poster clicks open a shareable full-page detail route. Data comes from TMDB details + credits + watch/providers (and optional OMDb score). Demo mode falls back to curated samples.

**Core:** hero (backdrop/poster, title, year, cert, score), overview, cast + directors/creators, movie runtime / TV seasons·episodes·status·ep runtime, where-to-watch by monetization (stream / free / ads / rent / buy) with best-effort season notes for TV.

**Also included:** genres + certification in the details block; TV networks + first/last air dates; movie theatrical vs digital release dates (from US release types when available).

Cast is capped at 8. **Back to results** restores the last filters, accumulated results (capped ~400 titles), and scroll position via `sessionStorage` (same for browser back to `/`).

**More like this:** up to 12 related titles from TMDB recommendations, topped up with similar when needed. Cards link to other detail pages without overwriting the home browse scroll snapshot.

### Endless scroll

Browse replaces Previous/Next with an accumulating feed:

- First fetch: **40** titles (2 TMDB pages).
- Auto top-up: when the user is within **20** titles of the end, fetch **+20** (1 TMDB page).
- After 5 consecutive empty batches (client-side filters rejecting a whole page), auto-load pauses and shows a **Load more** button.
- Site footer appears only at end-of-results; TMDB attribution also sits in the filter bar so it stays visible while scrolling.
- Session snapshot key `flickpick:browse-v2` stores discrete batches so truncating for quota still leaves a correct next-page cursor.

**Vibes:** TMDB keywords on the detail page when available, topped up with genres when keywords are sparse. Clicking a chip returns to results filtered by that keyword or genre. Home filters include a **Vibe** typeahead that only lists keywords with discover matches for the current Movies/TV mode (with counts). Keyword discover uses a lower vote-count floor than the default browse gate so niche tags aren’t emptied out.

**Credits / studios:** Actors, directors, creators, producers, and production companies on the detail page are clickable. They apply a TMDB `with_people` or `with_companies` discover filter (same media type) and return to results; active person/company chips appear in the filter bar and can be cleared. The main search has **typeahead** for titles and people: pick a title to open its detail page, or pick a person to browse their filmography. Typing without picking still runs a title-name search in the grid.

Not yet: trailer.

## Design notes

Light “projection lobby” palette (cool mist paper, ink type, cinema red accent). Brand set in Oswald at hero scale; UI in Figtree. Motions: brand letter-spacing entrance, filter fade-up, staggered poster reveals.
