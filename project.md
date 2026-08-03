# FlickPick

Movie finder that filters TMDB discover results by genre, MPAA certification, decade, and US streaming providers, then sorts/filters by score.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**
- **Tailwind CSS v4** for base tooling; custom CSS for the cinematic UI
- **TMDB API** for discover/search, genres, certifications, watch providers
- **OMDb API** (optional) for live IMDb ratings

## Why this stack

Short-term: fast local UI with server-side API proxying so keys stay off the client.  
Long-term: easy to add auth, watchlists, or a thicker data layer without rewriting the filter UX.

## Setup

1. Copy `.env.example` → `.env.local`
2. Add `TMDB_API_KEY` from [TMDB API settings](https://www.themoviedb.org/settings/api)
3. Optional: add `OMDB_API_KEY` from [OMDb](https://www.omdbapi.com/apikey.aspx) for IMDb scores
4. `npm install && npm run dev`

Without `TMDB_API_KEY`, the app runs in **demo mode** with a curated sample list so the UI is still usable.

## Architecture

| Piece | Role |
| --- | --- |
| `src/app/api/movies/route.ts` | Proxies filter params → TMDB (+ OMDb enrichment) |
| `src/lib/tmdb.ts` | Discover/search, decade/provider/cert mapping, score sort |
| `src/components/FlickPickApp.tsx` | Client state, debounced search, pagination |
| `src/components/Filters.tsx` | Genre, MPAA, decade, streaming chips, min score, sort |

### Score handling

- TMDB `vote_average` drives discover `vote_average.gte` and default ranking when OMDb is absent.
- With `OMDB_API_KEY`, each result’s IMDb id is resolved via TMDB external ids, then OMDb supplies `imdbRating`.
- Client-side re-sort for `imdb.desc` / `imdb.asc` and a final min-score pass after enrichment.
- Score badges link to the IMDb title page when an id is available.

### Streaming filter

Uses TMDB `with_watch_providers` + `watch_region=US` + `with_watch_monetization_types=flatrate` for subscription services (Netflix, Prime, Disney+, Max, Hulu, Apple TV+, Paramount+, Peacock).

## Design notes

Light “projection lobby” palette (cool mist paper, ink type, cinema red accent). Brand set in Oswald at hero scale; UI in Figtree. Motions: brand letter-spacing entrance, filter fade-up, staggered poster reveals.
