/**
 * The HTML shell around every page: global styles and the page title.
 * Leaflet's own CSS and the cluster CSS must be loaded here, or the map breaks.
 */

import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import "./globals.css";

export const metadata = {
  title: "Kissena Invasive Watch",
  description: "Invasive species sightings around Kissena Park and Queens College, Flushing, Queens.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
