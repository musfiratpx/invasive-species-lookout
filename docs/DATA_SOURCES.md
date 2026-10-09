# Data sources

Every source the app uses, with the date it was checked. **The Researcher keeps this file up to date.** Add a row whenever you add a fact sheet or change a data file.

For file-by-file details, see [backend/data/README.md](../backend/data/README.md).

## Official lists and rankings

| Source | Used for | URL | Checked |
|---|---|---|---|
| NYS DEC, 6 NYCRR Part 575 Prohibited and Regulated Invasive Species (list dated Sept 10, 2014; in effect since Mar 10, 2015) | Which species count as invasive; prohibited vs regulated | <https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf> | 2026-10-09 |
| NYS DEC invasive species regulations page | Confirms islist.pdf is the current printable list | <https://dec.ny.gov/nature/invasive-species/resources-regulations/regulations> | 2026-10-09 |
| NYS DEC prohibited & regulated plants booklet | Cross-check of plant names and synonyms | <https://dec.ny.gov/docs/lands_forests_pdf/isprohibitedplants2.pdf> | 2026-10-09 |
| NYS DEC prohibited & regulated animals booklet | Cross-check of animal names | <https://dec.ny.gov/docs/lands_forests_pdf/isprohibitedanimals.pdf> | 2026-10-09 |
| New York Non-Native Plant Invasiveness Ranking Forms, nyis.info (183 forms) | Plant danger levels (rank + score) | Listed per species in `backend/data/sources/nyis_plant_ranks.csv` | 2026-10-09 |
| NYS Ag & Markets announcement (2016) | Cross-check: 69 prohibited + 6 regulated plants | <https://agriculture.ny.gov/node/11711> | 2026-10-09 |

## Sightings, photos, sounds

| Source | Used for | URL | Checked |
|---|---|---|---|
| iNaturalist API (via pyinaturalist), research-grade observations | Sightings, photos, sounds, monthly counts | <https://api.inaturalist.org/v1/docs/> | 2026-10-09 |
| iNaturalist places: New York City (674), New York State (48), Kissena Park (125479), Kissena Corridor Park (125415) | Area fallbacks for photos and sounds | <https://www.inaturalist.org/places> | 2026-10-09 |

Each photo and sound carries its own attribution, license and observation link in `backend/data/cache/media.json`.

## Map and music

| Source | Used for | URL |
|---|---|---|
| OpenStreetMap tiles | Base map | <https://www.openstreetmap.org/copyright> |
| ElevenLabs Music API | Background music only (prompt saved in `frontend/public/audio/background.credit.json`) | <https://elevenlabs.io/docs/api-reference/music/compose> |

## Fact sheets (`backend/knowledge/`)

Every species seen in the area has a draft. Each one also cites the NYC Parks Rules (56 RCNY §1-04), verified against the official text of Title 56 Chapter 1 (amended through Mar 30, 2025).

| File | Species | Sources used | Accessed | Written by |
|---|---|---|---|---|
| `acer-platanoides.md` | Acer platanoides | [Norway Maple](https://nyis.info/species/norway-maple/); [New York Non-Native Plant Invasiveness Ranking Form, Acer pl](https://nyis.info/wp-content/uploads/2024/10/aa4a6_Acer.platanoides.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `acer-pseudoplatanus.md` | Acer pseudoplatanus | [Sycamore Maple](https://nyis.info/species/sycamore-maple/); [New York Non-Native Plant Invasiveness Ranking Form, Acer ps](https://nyis.info/wp-content/uploads/2024/10/5fdc1_Acer.pseudoplatanus.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `achyranthes-japonica.md` | Achyranthes japonica | [Japanese Chaff Flower](https://nyis.info/species/japanese-chaff-flower/); [New York Non-Native Plant Invasiveness Ranking Form, Achyran](https://nyis.info/wp-content/uploads/2024/10/f5e32_Achyranthes.japonica.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `alliaria-petiolata.md` | Alliaria petiolata | [Garlic Mustard](https://nyis.info/species/garlic-mustard/) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `aralia-elata.md` | Aralia elata | [Japanese Angelica Tree](https://nyis.info/species/japanese-angelica-tree/); [New York Non-Native Plant Invasiveness Ranking Form, Aralia ](https://nyis.info/wp-content/uploads/2024/10/02750_Aralia.elata_.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `artemisia-vulgaris.md` | Artemisia vulgaris | [Mugwort](https://nyis.info/species/mugwort/); [New York Non-Native Plant Invasiveness Ranking Form, Artemis](https://nyis.info/wp-content/uploads/2024/10/7168d_Artemisia.vulgaris.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `berberis-thunbergii.md` | Berberis thunbergii | [Japanese Barberry](https://nyis.info/species/japanese-barberry/); [New York Non-Native Plant Invasiveness Ranking Form, Berberi](https://nyis.info/wp-content/uploads/2024/10/30d9c_Berberis.thunbergii.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `carassius-auratus.md` | Carassius auratus | [Carassius auratus](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=508); [Guidelines for Owners of Aquariums and Exotic Pets](https://extapps.dec.ny.gov/docs/lands_forests_pdf/guideforaquaowners.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `celastrus-orbiculatus.md` | Celastrus orbiculatus | [Oriental Bittersweet](https://nyis.info/species/oriental-bittersweet/); [New York Non-Native Plant Invasiveness Ranking Form, Celastr](https://nyis.info/wp-content/uploads/2024/10/9b927_Celastrus.orbiculatus.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `centaurea-stoebe.md` | Centaurea stoebe | [Spotted Knapweed](https://nyis.info/species/spotted-knapweed/); [New York Non-Native Plant Invasiveness Ranking Form, Centaur](https://nyis.info/wp-content/uploads/2024/10/1d644_Centaurea.stoebe.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `cirsium-arvense.md` | Cirsium arvense | [Canada Thistle](https://nyis.info/species/canada-thistle/); [New York Non-Native Plant Invasiveness Ranking Form, Cirsium](https://nyis.info/wp-content/uploads/2024/10/eb734_Cirsium.arvense.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `clematis-terniflora.md` | Clematis terniflora | [Japanese Virgin's Bower](https://nyis.info/species/japanese-virgins-bower/); [New York Non-Native Plant Invasiveness Ranking Form, Clemati](https://nyis.info/wp-content/uploads/2024/10/304f0_Clematis.terniflora.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `corbicula-fluminea.md` | Corbicula fluminea | [Asian Clam](https://nyis.info/species/asian-clam/) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `cygnus-olor.md` | Cygnus olor | [Mute Swan](https://nyis.info/species/mute-swan/) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `cyprinus-carpio.md` | Cyprinus carpio | [Cyprinus carpio](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=4); [Guidelines for Owners of Aquariums and Exotic Pets](https://extapps.dec.ny.gov/docs/lands_forests_pdf/guideforaquaowners.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `dioscorea-polystachya.md` | Dioscorea polystachya | [New York Non-Native Plant Invasiveness Ranking Form, Dioscor](https://nyis.info/wp-content/uploads/2024/10/d971e_Dioscorea.polystachya.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `elaeagnus-umbellata.md` | Elaeagnus umbellata | [Autumn Olive](https://nyis.info/species/autumn-olive/); [New York Non-Native Plant Invasiveness Ranking Form, Elaeagn](https://nyis.info/wp-content/uploads/2024/10/128ee_Elaeagnus.umbellata.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `euonymus-alatus.md` | Euonymus alatus | [New York Non-Native Plant Invasiveness Ranking Form, Euonymu](https://nyis.info/wp-content/uploads/2024/10/c77f1_Euonymus.alatus.NYS_.pdf); [NYS DEC 6 NYCRR Part 575 Prohibited and Regulated Invasive S](https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `euonymus-fortunei.md` | Euonymus fortunei | [New York Non-Native Plant Invasiveness Ranking Form, Euonymu](https://nyis.info/wp-content/uploads/2024/10/b1fc4_Euonymus-fortunei.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `ficaria-verna.md` | Ficaria verna | [Lesser Celandine](https://nyis.info/species/lesser-celandine/) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `frangula-alnus.md` | Frangula alnus | [New York Non-Native Plant Invasiveness Ranking Form, Frangul](https://nyis.info/wp-content/uploads/2024/10/540b7_Frangula.alnus_.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `hemigrapsus-sanguineus.md` | Hemigrapsus sanguineus | [Asian Shore Crab](https://nyis.info/species/asian-shore-crab/) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `how-to-report.md` | (general) | [Report an Invasive](https://www.nyimapinvasives.org/report) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `humulus-japonicus.md` | Humulus japonicus | [Japanese Hops](https://nyis.info/species/japanese-hops/); [New York Non-Native Plant Invasiveness Ranking Form, Humulus](https://nyis.info/wp-content/uploads/2024/10/c7aeb_Humulus.japonicus.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `ligustrum-obtusifolium.md` | Ligustrum obtusifolium | [Border Privet](https://nyis.info/species/border-privet/); [New York Non-Native Plant Invasiveness Ranking Form, Ligustr](https://nyis.info/wp-content/uploads/2024/10/10d08_Ligustrum.obtusifolium.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `lonicera-japonica.md` | Lonicera japonica | [Honeysuckle Spp.](https://nyis.info/species/honeysuckle-spp/); [New York Non-Native Plant Invasiveness Ranking Form, Lonicer](https://nyis.info/wp-content/uploads/2024/10/854e3_Lonicera.japonica.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `lonicera-maackii.md` | Lonicera maackii | [Honeysuckle Spp.](https://nyis.info/species/honeysuckle-spp/); [New York Non-Native Plant Invasiveness Ranking Form, Lonicer](https://nyis.info/wp-content/uploads/2024/10/e4b40_Lonicera.maackii.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `lymantria-dispar.md` | Lymantria dispar | [Spongy Moth](https://dec.ny.gov/nature/animals-fish-plants/insects-and-other-species/spongy-moth) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `lythrum-salicaria.md` | Lythrum salicaria | [Purple Loosestrife](https://nyis.info/species/purple-loosestrife/); [New York Non-Native Plant Invasiveness Ranking Form, Lythrum](https://nyis.info/wp-content/uploads/2024/10/94552_Lythrum.salicaria.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `misgurnus-anguillicaudatus.md` | Misgurnus anguillicaudatus | [Misgurnus anguillicaudatus](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=498); [Guidelines for Owners of Aquariums and Exotic Pets](https://extapps.dec.ny.gov/docs/lands_forests_pdf/guideforaquaowners.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `myiopsitta-monachus.md` | Myiopsitta monachus | [New York State Assembly Bill A1783](https://legislation.nysenate.gov/pdf/bills/2021/A1783); [NYS DEC 6 NYCRR Part 575 Prohibited and Regulated Invasive S](https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `persicaria-perfoliata.md` | Persicaria perfoliata | [Mile-a-Minute](https://nyis.info/species/mile-a-minute/); [New York Non-Native Plant Invasiveness Ranking Form, Persica](https://nyis.info/wp-content/uploads/2024/10/a9b18_Persicaria.perfoliata.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `phragmites-australis.md` | Phragmites australis | [Common Reed](https://nyis.info/species/common-reed/); [New York Non-Native Plant Invasiveness Ranking Form, Phragmi](https://nyis.info/wp-content/uploads/2024/10/a27a2_Phragmites.australis.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `phyllostachys-aureosulcata.md` | Phyllostachys aureosulcata | [New York Non-Native Plant Invasiveness Ranking Form, Phyllos](https://nyis.info/wp-content/uploads/2024/10/6ab45_Phyllostachys.aureosulcata_and_P.aurea_.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `reynoutria-japonica.md` | Reynoutria japonica | [Japanese Knotweed](https://nyis.info/species/japanese-knotweed/); [New York Non-Native Plant Invasiveness Ranking Form, Reynout](https://nyis.info/wp-content/uploads/2024/10/19e83_Fallopia.japonica-sachalinensis.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `robinia-pseudoacacia.md` | Robinia pseudoacacia | [New York Non-Native Plant Invasiveness Ranking Form, Robinia](https://nyis.info/wp-content/uploads/2024/10/97fa0_Robinia.pseudoacacia.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `rosa-multiflora.md` | Rosa multiflora | [Multiflora Rose](https://nyis.info/species/multiflora-rose/) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `rubus-phoenicolasius.md` | Rubus phoenicolasius | [Wineberry](https://nyis.info/species/wineberry/); [New York Non-Native Plant Invasiveness Ranking Form, Rubus p](https://nyis.info/wp-content/uploads/2024/10/bd20f_Rubus.phoenicolasius.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `salix-atrocinerea.md` | Salix atrocinerea | [New York Non-Native Plant Invasiveness Ranking Form, Salix a](https://nyis.info/wp-content/uploads/2024/10/4b4bf_Salix.-atrocinerea-cinerea.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |
| `silphium-perfoliatum.md` | Silphium perfoliatum | [New York Non-Native Plant Invasiveness Ranking Form, Silphiu](https://nyis.info/wp-content/uploads/2024/10/d8be1_Silphium.perforatum.NYS_.pdf) + NYC Parks Rules §1-04 | 2026-10-09 | Claude (draft), needs Researcher review |

## Decisions log

Record judgment calls here so the team can explain them.

| Date | Decision | Why |
|---|---|---|
| 2026-10-09 | Area = 2 km circle around 40.741, -73.812 | Covers both Kissena Park and Queens College; iNaturalist's park boundary leaves out QC. |
| 2026-10-09 | Sounds only looked up for animals | "Sounds" attached to plant observations are birdsong or wind, not the plant. |
| 2026-10-09 | Sightings identified only to a parent species don't count for below-species list entries (porcelain berry, red-eared slider, Africanized honey bee) | The list names the variety or subspecies; counting the whole species would be a guess. The Researcher may revisit this. |
| 2026-10-09 | Bamboos (*Phyllostachys*) and *Myriophyllum heterophyllum × laxum* are "Not yet ranked" | Their forms are "Not Assessable", or there is no form. |
| 2026-10-09 | Mute swan `touch_safe: false` | NYIS: "Do not handle or harm the swans, their nests, or any eggs without DEC authorization." All plant sheets stay `null`: no source says explicitly whether touching is safe. |
| 2026-10-09 | NYC Parks rule added to every plant's "How to handle it" and to the general reporting text | 56 RCNY §1-04(b)(1)(iii) forbids removing or killing vegetation in parks without permission; §1-04(g)(1) forbids harming animals, nests or eggs. Verified from the official rule text the team provided. |
| 2026-10-09 | `touch_safe: false` for mute swan, Japanese hops, wineberry, mile-a-minute, spongy moth | Each source explicitly warns against handling (quoted in a comment in each file's header). All others stay `null`. |
| 2026-10-09 | USGS Nonindigenous Aquatic Species fact sheets used for goldfish, common carp and oriental weatherfish | Federal government source, not on the original source list; NYS DEC had no species pages for them. |
| 2026-10-09 | Monk parakeet history comes from a *proposed* 2021 NY Assembly bill (A1783) | Cornell's All About Birds blocks automated access and DEC has no page. The sheet says clearly it is a proposed bill's findings. **Researcher: replace with Cornell/DEC text if you can access it in a browser.** |
| 2026-10-09 | 8 plants use only their NY ranking form (black locust, cup-plant, alder buckthorn, wintercreeper, burning bush, Chinese yam, yellow-groove bamboo, rusty willow) | No NYIS profile page exists for them. Their "Seasonal differences" sections are empty because the forms don't cover seasons. |
| 2026-10-09 | Curly pondweed keeps rank "Very High" although its score is 79.79 | We copy the official rank as published. |
