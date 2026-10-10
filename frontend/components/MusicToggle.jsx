"use client";
/**
 * Background music on/off. OFF by default, and it only starts after a click
 * (browsers block sound that plays by itself). The choice is remembered in
 * localStorage. If the music file hasn't been generated yet, the button is hidden
 * (a disabled "Music not available" button looked broken).
 * Music file: public/audio/background.mp3, made by backend/scripts/make_music.py.
 */

import { useEffect, useRef, useState } from "react";

const MUSIC_URL = "/audio/background.mp3";
const STORAGE_KEY = "music-on";
const VOLUME = 0.3;

export default function MusicToggle() {
  const audio = useRef(null);
  const [on, setOn] = useState(false);
  const [missing, setMissing] = useState(false);
  const [available, setAvailable] = useState(false); // only show the button once we know the file exists

  // Check once (without downloading the whole file) whether the music has been generated.
  useEffect(() => {
    fetch(MUSIC_URL, { method: "HEAD" })
      .then((r) => setAvailable(r.ok))
      .catch(() => setAvailable(false));
  }, []);

  useEffect(() => {
    const el = new Audio();
    el.preload = "none"; // set before src, so nothing downloads until someone presses play
    el.loop = true;
    el.volume = VOLUME;
    el.src = MUSIC_URL;
    el.addEventListener("error", () => setMissing(true));
    audio.current = el;

    // If the visitor turned music on last time, start it on their first click
    // anywhere (we're not allowed to start it before they interact).
    let wantsMusic = false;
    try {
      wantsMusic = localStorage.getItem(STORAGE_KEY) === "true";
    } catch {}
    const startOnFirstClick = () => {
      el.play().then(() => setOn(true)).catch(() => {});
    };
    if (wantsMusic) window.addEventListener("pointerdown", startOnFirstClick, { once: true });

    return () => {
      el.pause();
      window.removeEventListener("pointerdown", startOnFirstClick);
    };
  }, []);

  const toggle = () => {
    const el = audio.current;
    const next = !on;
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {}
    if (next) {
      el.play().then(() => setOn(true)).catch(() => setMissing(true));
    } else {
      el.pause();
      setOn(false);
    }
  };

  if (!available || missing) return null; // run backend/scripts/make_music.py to create the music
  return (
    <button className="music-button" onClick={toggle} aria-pressed={on} aria-label={on ? "Turn background music off" : "Turn background music on"}>
      <span aria-hidden="true">{on ? "🔊" : "🔈"}</span>
      <span className="music-label">{on ? " Music on" : " Music off"}</span>
    </button>
  );
}
