# Demo guide

For whoever presents to the judges. Practice it twice before judging.

## 1. Run the fast (production) build

The dev server (`npm run dev`) is slower and recompiles pages on first visit. For the demo:

```bash
# terminal 1
cd backend && source .venv/bin/activate && uvicorn app.main:app      # no --reload

# terminal 2
cd frontend && npm run demo        # = next build && next start, at http://localhost:3000
```

Check <http://localhost:8000/api/health>: `"observations": 14620` means the data loaded.

## 2. The 60-second script

| Time | Do | Say |
|---|---|---|
| 0:00 | Map of all of Queens is open | "This is every research-grade sighting of a New York–listed invasive species in Queens: 14,620 sightings of 76 species." |
| 0:10 | Type **Kissena** in search → pick **Kissena Park** | "Pick any park. Here's Kissena Park, outlined using official NYC Parks boundaries." |
| 0:20 | Point at the park profile | "31 listed invasive species have been seen here, and 16 of them are rated Very High risk." |
| 0:30 | Tap **Mute Swan** in the park's species list | "Everyone knows the swans in the lake. They're actually prohibited in New York." |
| 0:40 | Point at the danger box | "This danger level comes from New York's official legal list, explained in plain words. AI never decides it." |
| 0:48 | Point at **📣 Report a sighting** | "One tap opens New York's official reporting site." |
| 0:53 | Close the panel → **Show all** → in Filter, pick **Heat map** | "Zoom out, and you can see where invasives cluster across the whole borough." |

If something breaks mid-demo, keep talking and switch to `docs/screenshot.jpg`.

**If there's extra time** (or a judge asks):
- Point at the small **"🔎 Found by Snowflake Cortex Search in our fact sheet … · shown word for word"** line under any text. That is the RAG step, made visible.
- **☰ Browse → Near me → Try an example place: Queens College**: "15 listed species within 500 m of this campus." (Use the real "Use my location" only if the browser already has permission.)
- **☰ Browse → Recently seen**: what people found this month.

**Start from a link.** Open the demo straight to a view with `http://localhost:3000/?park=Q024` (Kissena Park). A QR code only works for judges' phones if the app is reachable from them. A laptop on venue Wi-Fi usually isn't, so keep QR codes for a deployed version.

## 3. Venue prep (the morning of judging)

- **Load fresh data before judging.** The Near me / Recently seen numbers above are from the Oct 9 data. If you rerun the fetch scripts, check them again.
- **Pre-warm map tiles and photos.** Map tiles and species photos come from the internet. Before judging, open the app on the demo laptop and run through the script once, zooming into Kissena Park, so the tiles and photos are in the browser cache.
- **Have a phone hotspot ready** in case the venue Wi-Fi is slow. The app's own data (sightings, species text, parks) is served from the laptop, so it works without internet; only tiles and photos need it.
- Close other tabs, turn off notifications, set the browser zoom to 100%, and plug in the charger.
- Start both servers **before** walking to the table (step 1).

## 4. Likely questions

**"Why do some species say 'Not yet ranked'?"**
We only show official danger levels. Plants use New York's invasiveness ranking (a 0–100 score from state experts). Animals use their legal category on the state list (prohibited or regulated). If we can't find an official rank, we say so instead of guessing. See [SCORING.md](SCORING.md).

**"Why does the map show fewer sightings than the total?"** (e.g. Mute Swan: 879 on the map, 984 total)
Some iNaturalist observers hide their exact location (iNaturalist then moves the point up to ~20 km), and some sightings are only placed at "Queens" in general. Drawing those would put species in the wrong place, so we count them in totals and charts but don't draw them.

**"Why does it say 'Draft'?"**
The fact sheets were written from official sources, and each one stays marked "Draft" until a teammate has checked every sentence against those sources. We'd rather say so than claim more than we've checked.

**"Did AI write this?"**
- The **data** is real: iNaturalist sightings, the NYS DEC list, the official plant ranking forms, and NYC Parks boundaries.
- **Danger levels and invasive status** are never set by AI. They come straight from official sources.
- The **species text** comes from fact sheets built from official sources (NYIS, DEC, USGS…) and linked under "Sources". **Snowflake Cortex Search** finds the right section for each question, and we show that text word for word. We turned AI rewriting off because, in testing, it added small details the sources don't say.
- We used AI coding assistants to help write the code, and every source is checked and linked.
- **ElevenLabs** is used only for the background music. Animal sounds are real recordings from iNaturalist, shown only when one exists.

**"Where does the data come from, and how fresh is it?"**
iNaturalist, fetched politely (about 1 request per second) and cached. The footer shows when it was last updated. Full list: [DATA_SOURCES.md](DATA_SOURCES.md).

**"What would you do next?"**
Get expert review of every fact sheet, cover all five boroughs (one setting: `INAT_PLACE_IDS=674`), and send reports straight to iMapInvasives with the sighting's location filled in.
