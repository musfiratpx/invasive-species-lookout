"use client";

/**
 * "How it sounds": a real recording from iNaturalist, with credit.
 * Renders NOTHING when sound is null (most species, since most are plants).
 * Recordings with no license are linked, not played, as reuse isn't allowed.
 *
 * Looks like the SAIL mockup's "Listen" card: a round ▶ / ❚❚ button, the recording's
 * waveform (bars fill in as it plays; click a bar to jump there) and the time.
 * The waveform is a picture of the real recording, measured ahead of time by
 * backend/scripts/build_sound_waves.py. Without it, the browser's own player is shown.
 */

import { useEffect, useRef, useState } from "react";

/** 7.4 -> "0:07" */
function clock(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function SoundPlayer({ sound }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Leaving the panel mid-recording: let the background music come back.
  useEffect(() => {
    return () => {
      if (audioRef.current && !audioRef.current.paused) {
        window.dispatchEvent(new Event("animal-audio-stop"));
      }
    };
  }, []);

  if (!sound) return null;
  const peaks = sound.waveform;
  const duration = sound.seconds || 0;

  function toggle() {
    const audio = audioRef.current;
    if (audio.paused) audio.play();
    else audio.pause();
  }

  function jumpTo(fraction) {
    const audio = audioRef.current;
    audio.currentTime = fraction * duration;
    setTime(audio.currentTime);
    if (audio.paused) audio.play();
  }

  const audioEvents = {
    onPlay: () => { setPlaying(true); window.dispatchEvent(new Event("animal-audio-play")); },
    onPause: () => { setPlaying(false); window.dispatchEvent(new Event("animal-audio-stop")); },
    onEnded: () => { setPlaying(false); setTime(0); },
    onTimeUpdate: (e) => setTime(e.currentTarget.currentTime),
  };

  return (
    <section className="card sound-card">
      <h3>Listen · How it sounds</h3>
      {!sound.license ? (
        <a href={sound.observation_url} target="_blank" rel="noreferrer">Listen on iNaturalist</a>
      ) : peaks ? (
        <div className="sound-player">
          <audio ref={audioRef} preload="none" src={sound.file_url} {...audioEvents} />
          <button className="sound-play" onClick={toggle} aria-label={playing ? "Pause recording" : "Play recording"}>
            <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
          </button>
          {/* Click the wave to jump to that point. It's a picture, so screen readers skip it; ▶ works with the keyboard. */}
          <div className="sound-wave" aria-hidden="true"
               onClick={(e) => { const box = e.currentTarget.getBoundingClientRect(); jumpTo((e.clientX - box.left) / box.width); }}>
            {peaks.map((level, i) => (
              <span key={i} className={duration && i / peaks.length < time / duration ? "played" : undefined}
                    style={{ height: `${Math.max(12, level * 100)}%` }} />
            ))}
          </div>
          <span className="sound-time">{clock(playing || time ? time : duration)}</span>
        </div>
      ) : (
        <audio ref={audioRef} controls preload="none" src={sound.file_url} style={{ width: "100%" }} {...audioEvents}>
          <a href={sound.file_url}>Download the recording</a>
        </audio>
      )}
      {sound.observer_note && <p className="muted">Observer&apos;s note: &ldquo;{sound.observer_note}&rdquo;</p>}
      <p className="caption">
        {sound.attribution} ·{" "}
        <a href={sound.observation_url} target="_blank" rel="noreferrer">iNaturalist observation</a>
      </p>
    </section>
  );
}
