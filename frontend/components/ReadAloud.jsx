"use client";
/**
 * "Read aloud" button for the species panel, for people who find reading hard or have low vision.
 * It uses the browser's own built-in voice (speechSynthesis): free, works offline, and no
 * AI voice service (CLAUDE.md rule 4 keeps ElevenLabs for background music only).
 * It reads only text already shown in the panel, word for word. It is not a species sound.
 * Hidden in browsers without a built-in voice.
 */

import { useEffect, useState } from "react";

export default function ReadAloud({ text }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Checked after the page loads, since the server has no browser voice to check.
  useEffect(() => setSupported("speechSynthesis" in window), []);

  // Stop talking when the panel closes or shows a different species.
  useEffect(() => () => window.speechSynthesis?.cancel(), [text]);

  if (!supported) return null;

  function toggle() {
    window.speechSynthesis.cancel(); // also clears anything left over from another panel
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button className="read-aloud" onClick={toggle} aria-pressed={speaking}>
      <span aria-hidden="true">{speaking ? "⏹" : "🔊"}</span> {speaking ? "Stop reading" : "Read aloud"}
    </button>
  );
}
