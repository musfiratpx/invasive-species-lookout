"use client";

/**
 * "How it sounds": a real recording from iNaturalist, with credit.
 * Renders NOTHING when sound is null (most species, since most are plants).
 * Recordings with no license are linked, not played, as reuse isn't allowed.
 */

import { useEffect, useRef } from "react";

export default function SoundPlayer({ sound }) {
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current && !audioRef.current.paused) {
        window.dispatchEvent(new Event("animal-audio-stop"));
      }
    };
  }, []);

  if (!sound) return null;

  return (
    <section>
      <h3>How it sounds</h3>
      {sound.license ? (
        <audio
          ref={audioRef}
          controls
          preload="none"
          src={sound.file_url}
          style={{ width: "100%" }}
          onPlay={() => window.dispatchEvent(new Event("animal-audio-play"))}
          onPause={() => window.dispatchEvent(new Event("animal-audio-stop"))}
        >
          <a href={sound.file_url}>Download the recording</a>
        </audio>
      ) : (
        <a href={sound.observation_url} target="_blank" rel="noreferrer">Listen on iNaturalist</a>
      )}
      {sound.observer_note && <p className="muted">Observer&apos;s note: &ldquo;{sound.observer_note}&rdquo;</p>}
      <p className="caption">
        {sound.attribution} ·{" "}
        <a href={sound.observation_url} target="_blank" rel="noreferrer">iNaturalist observation</a>
      </p>
    </section>
  );
}
