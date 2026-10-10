# Invasive Species Lookout (ISL): ground rules

An interactive map of invasive species across all five boroughs of New York City (it started around Kissena Park and Queens College, then grew to all of Queens, then all of NYC), built at HackKnight 2026 by beginner developers. Optimize for: works end to end, easy to read, honest data.

These rules are non-negotiable:

1. **Danger level is never produced by an AI model.** It comes from `backend/data/danger_levels.csv` and is matched automatically by scientific name, synonyms included. A species with no entry shows "Not yet ranked". Never guess.
2. **Invasive status is never decided by AI.** A species is invasive in this app only if it appears in `backend/data/ny_invasive_list.csv` (NYS DEC 6 NYCRR Part 575). iNaturalist's "introduced" flag is *not* the same as invasive.
3. **No invented sounds.** Never generate, synthesize or AI-create species sounds. Only play real recordings from iNaturalist observations, with attribution and license shown. If there is none, hide the section.
4. **ElevenLabs is only for background music.** No ElevenLabs voices or sound effects for species.
5. **RAG answers must be grounded.** Generate only from retrieved source documents, and return source names and URLs with every answer. If the sources don't cover a section, say "No information in our sources yet". For "How to handle it" with no source, show: "We haven't found official guidance. Avoid touching it and report the sighting."
6. **Real data only. Never fabricate** sightings, scores, rankings, statistics, URLs or quotes. Any example data must be clearly labeled as example data.
7. **Secrets** live only in `.env` files, which are gitignored. Commit `.env.example` files with empty values. Never hard-code or print keys, and never send them to the frontend.
8. **Be polite to iNaturalist:** go through `pyinaturalist`, about 1 request/second, well under 10,000/day. Cache results to files; the app reads the cache, never live iNaturalist on page load. The demo must work offline.
9. **Credit and licenses:** every photo and sound shows attribution and license and links to its iNaturalist observation. Prefer CC licenses. For "all rights reserved" media, show a "View on iNaturalist" link instead of embedding it.
10. **Beginner-friendly code:** small files, clear names, a short docstring or comment at the top of every file, no clever abstractions. Comments explain *why*.

## Running it

- Backend (from `backend/`): `source .venv/bin/activate && uvicorn app.main:app --reload` → http://localhost:8000/docs
- Frontend (from `frontend/`): `npm run dev` → http://localhost:3000
- Tests (from `backend/`): `pytest`
