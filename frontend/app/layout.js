/**
 * The HTML shell around every page: global styles and the page title.
 * Leaflet's own CSS and the cluster CSS must be loaded here, or the map breaks.
 */

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css"; // cluster animations; bubble colors are ours (globals.css)
import "maplibre-gl/dist/maplibre-gl.css"; // the background map (components/Basemap.jsx)
import "./globals.css";

export const metadata = {
  title: "Invasive Species Lookout",
  description: "Where New York-listed invasive species have been spotted across New York City, how risky they are, and how to report them.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
