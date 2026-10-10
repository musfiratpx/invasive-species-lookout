/**
 * The HTML shell around every page: global styles, fonts and the page title.
 * Leaflet's own CSS and the cluster CSS must be loaded here, or the map breaks.
 *
 * Fonts: next/font downloads them once and serves them from this app (no call to Google
 * when someone opens the page), so the offline demo keeps its fonts.
 *   - Source Sans 3 for text: plain and very readable, with normal (not slashed) zeros.
 *     (We tried Atkinson Hyperlegible, but its slashed zeros made dates and counts look odd.)
 *   - Source Serif 4 for headings, its serif partner, for the field-guide look.
 */

import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css"; // cluster animations; bubble colors are ours (globals.css)
import "maplibre-gl/dist/maplibre-gl.css"; // the background map (components/Basemap.jsx)
import "./globals.css";

// Each font sets a CSS variable that globals.css uses (--font-sans, --font-serif).
const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata = {
  title: "Invasive Species Lookout",
  description: "Where New York-listed invasive species have been spotted across New York City, how risky they are, and how to report them.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
