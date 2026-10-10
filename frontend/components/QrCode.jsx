"use client";
/**
 * A QR code for a link, drawn as SVG (sharp when printed). Made in the browser by
 * the `qrcode` library, so it works offline and the link is never sent anywhere.
 * Used on the printable park field guide to get from paper to the live map.
 */

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export default function QrCode({ url, label, className = "qr-code" }) {
  const [svg, setSvg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // margin 0: the page adds its own spacing. "M" still scans with small smudges or creases.
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" })
      .then((markup) => !cancelled && setSvg(markup))
      .catch(() => !cancelled && setSvg(null));
    return () => { cancelled = true; };
  }, [url]);

  if (!svg) return null;
  // role="img" + aria-label: screen readers say what the code opens instead of reading the drawing.
  return <div className={className} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}
