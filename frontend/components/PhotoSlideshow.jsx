"use client";
/**
 * Photo slideshow: arrow buttons, dots, swipe on phones, and a credit under every photo.
 * Photos with no license ("all rights reserved") are not embedded. We link to
 * iNaturalist instead, as the photographer hasn't allowed reuse.
 */

import { useEffect, useRef, useState } from "react";

const SWIPE_MIN_PX = 40;

export default function PhotoSlideshow({ photos, speciesName }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => setIndex(0), [photos]); // start at the first photo for each new species

  if (!photos || photos.length === 0) {
    return <div className="slide-frame muted">No photos yet</div>;
  }

  const count = photos.length;
  const photo = photos[index];
  const go = (step) => setIndex((i) => (i + step + count) % count);

  const onTouchStart = (e) => (touchStartX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > SWIPE_MIN_PX) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  return (
    <div className="slideshow" aria-roledescription="carousel" aria-label={`Photos of ${speciesName}`}>
      <div className="slide-frame" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {photo.license ? (
          <img src={photo.url} alt={`${speciesName}, photo ${index + 1} of ${count}`} />
        ) : (
          <a href={photo.observation_url} target="_blank" rel="noreferrer">View this photo on iNaturalist</a>
        )}
      </div>

      {count > 1 && (
        <div className="slide-controls">
          <button onClick={() => go(-1)} aria-label="Previous photo">‹</button>
          <div className="dots">
            {photos.map((p, i) => (
              <button
                key={p.url}
                className={`dot${i === index ? " active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
          <button onClick={() => go(1)} aria-label="Next photo">›</button>
        </div>
      )}

      <p className="caption">
        {photo.attribution}
        {photo.license && ` · ${photo.license.toUpperCase()}`} ·{" "}
        <a href={photo.observation_url} target="_blank" rel="noreferrer">iNaturalist observation</a>
      </p>
    </div>
  );
}
