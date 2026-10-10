/**
 * The HTML shell around every page: global styles and the page title.
 * Leaflet's own CSS and the cluster CSS must be loaded here, or the map breaks.
 */

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css"; // cluster animations; bubble colors are ours (globals.css)
import "./globals.css";

export const metadata = {
  title: "Kissena Invasive Watch",
  description: "Invasive species sightings across New York City, starting from Kissena Park in Queens.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
