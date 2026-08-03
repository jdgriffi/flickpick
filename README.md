# FlickPick

Find movies by **genre**, **MPAA rating**, **decade**, **streaming service**, and **score** (IMDb via OMDb when configured, otherwise TMDB).

## Quick start

```bash
cp .env.example .env.local
# Add TMDB_API_KEY (required for live data)
# Optional: OMDB_API_KEY for IMDb scores
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without a TMDB key the UI runs in demo mode with sample titles.

## Docs

See [project.md](./project.md) for architecture and design decisions.

This product uses the TMDB API but is not endorsed or certified by TMDB.
