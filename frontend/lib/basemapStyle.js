/**
 * The background map: OpenFreeMap's free "Positron" style (OpenStreetMap data, no API key),
 * simplified and recolored in the site's forest greens.
 *
 * Why simplify: the standard map draws every street, rail line and building, which made the
 * sightings hard to see. Here we hide those layers and keep land, water, parks, main roads
 * and place names. Side streets only appear when zoomed in close, where they help you find a spot.
 *
 * To tweak the look, edit HIDDEN_LAYERS, SIDE_STREETS_FROM_ZOOM or PAINT below. Layer names
 * come from the style itself: https://tiles.openfreemap.org/styles/positron
 */

export const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

// OpenFreeMap asks for this credit line (and OpenStreetMap's license requires its part).
export const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

// Layers we don't draw at all: detail that clutters a city-wide map of sightings.
const HIDDEN_LAYERS = [
  "building",
  "landuse_residential", // grey blotches over most of the city
  "highway_path", "highway-name-path", // footpaths
  "railway", "railway_dashline", "railway_transit", "railway_transit_dashline",
  "railway_service", "railway_service_dashline",
  "tunnel_motorway_casing", "tunnel_motorway_inner",
  "aeroway-taxiway", "aeroway-runway-casing", "aeroway-runway",
  "boundary_2", "boundary_3", "boundary_disputed",
  "highway-shield-non-us", "highway-shield-us-interstate", "road_shield_us",
];

// Side streets (and their names) only from this zoom level: about one neighborhood on screen.
const SIDE_STREETS_FROM_ZOOM = 14.5;
const SIDE_STREET_LAYERS = ["highway_minor", "highway-name-minor"];

// Colors, from the site palette (globals.css): forest #18382f, cream #f5f5e9, leaf and sage greens.
const PAINT = {
  background: { "background-color": "#eef0e2" }, // land
  park: { "fill-color": "#d3e2bf" },
  landcover_wood: { "fill-color": "#c9dab3" },
  water: { "fill-color": "#a6c3cf" }, // blue-gray, so shorelines stand out from green parks
  waterway: { "line-color": "#a6c3cf" },
  "aeroway-area": { "fill-color": "#e4e8d6" },
  road_area_pier: { "fill-color": "#eef0e2" },
  road_pier: { "line-color": "#eef0e2" },
  highway_minor: { "line-color": "#e2e7d3" },
  highway_major_casing: { "line-color": "#d3dbc3" },
  highway_major_inner: { "line-color": "#f8f8ee" },
  highway_major_subtle: { "line-color": "#dfe4d0" },
  highway_motorway_casing: { "line-color": "#cbd5ba" },
  highway_motorway_inner: { "line-color": "#f8f8ee" },
  highway_motorway_subtle: { "line-color": "#dfe4d0" },
  highway_motorway_bridge_casing: { "line-color": "#cbd5ba" },
  highway_motorway_bridge_inner: { "line-color": "#f8f8ee" },
};
const LABEL_TEXT = "#18382f"; // forest green place names
const WATER_LABEL_TEXT = "#3b6275";
const LABEL_HALO = "#f5f5e9"; // cream outline so names stay readable

// The five boroughs get their own big, bold labels (BOROUGH_LABELS below), so at the opening
// city-wide view people can tell at a glance which borough they're looking at.
const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "The Bronx", "Bronx", "Staten Island"];
const isBorough = ["match", ["coalesce", ["get", "name_en"], ["get", "name"]], BOROUGHS, true, false];

const BOROUGH_LABELS = {
  id: "label_borough",
  type: "symbol",
  source: "openmaptiles",
  "source-layer": "place",
  minzoom: 9,
  maxzoom: 14, // closer in, neighborhood names matter more
  filter: isBorough,
  layout: {
    "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
    "text-font": ["Noto Sans Bold"],
    "text-size": ["interpolate", ["linear"], ["zoom"], 9, 13, 12, 18],
    "text-transform": "uppercase",
    "text-letter-spacing": 0.15,
  },
  paint: { "text-color": "#18382f", "text-halo-color": "#f5f5e9", "text-halo-width": 2, "text-opacity": 0.85 },
};

/** Returns a copy of the Positron style with busy layers hidden and our colors applied. */
export function simplifyStyle(style) {
  const layers = style.layers
    .filter((layer) => !HIDDEN_LAYERS.includes(layer.id))
    .map((layer) => {
      const paint = { ...layer.paint, ...PAINT[layer.id] };
      if (layer.type === "symbol") {
        paint["text-color"] = layer.id.startsWith("water") ? WATER_LABEL_TEXT : LABEL_TEXT;
        paint["text-halo-color"] = LABEL_HALO;
      }
      const minzoom = SIDE_STREET_LAYERS.includes(layer.id) ? Math.max(layer.minzoom || 0, SIDE_STREETS_FROM_ZOOM) : layer.minzoom;
      // Place labels leave the boroughs out, since BOROUGH_LABELS draws them bigger.
      const filter = layer["source-layer"] === "place" && layer.filter ? ["all", layer.filter, ["!", isBorough]] : layer.filter;
      return { ...layer, paint, ...(filter && { filter }), ...(minzoom !== undefined && { minzoom }) };
    });
  return { ...style, layers: [...layers, BOROUGH_LABELS] };
}
