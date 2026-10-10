"use client";
/**
 * A small 🔊 button that reads one paragraph out loud, placed next to each paragraph in the
 * species panel so people can listen at their own pace. Press it again (⏹) to stop.
 *
 * It uses the browser's own built-in voice (speechSynthesis): free, works offline, and no
 * AI voice service (CLAUDE.md rule 4 keeps ElevenLabs for background music only).
 * It reads only the text already on screen, word for word. It is not a species sound.
 * Hidden in browsers without a built-in voice.
 *
 * Only one paragraph reads at a time: starting one tells the others (with a window event)
 * to switch their button back to 🔊.
 */

import { useEffect, useId, useRef, useState } from "react";

const STARTED = "read-aloud-started";

export default function ReadAloud({ text, label = "this paragraph" }) {
  const id = useId();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speakingNow = useRef(false); // the same, readable when the paragraph goes away
  speakingNow.current = speaking;

  // Checked after the page loads, since the server has no browser voice to check.
  useEffect(() => setSupported("speechSynthesis" in window), []);

  // Another paragraph started reading: this one has stopped.
  useEffect(() => {
    const onStarted = (e) => e.detail !== id && setSpeaking(false);
    window.addEventListener(STARTED, onStarted);
    return () => window.removeEventListener(STARTED, onStarted);
  }, [id]);

  // Stop talking if this paragraph goes away (panel closed, another species opened).
  // Only on the way out: running on every change would also stop a paragraph that just started.
  useEffect(() => () => { if (speakingNow.current) window.speechSynthesis.cancel(); }, []);

  if (!supported || !text) return null;

  function toggle() {
    window.speechSynthesis.cancel(); // stops whatever was reading, here or in another paragraph
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.dispatchEvent(new CustomEvent(STARTED, { detail: id }));
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button className="read-aloud" onClick={toggle} aria-pressed={speaking}
            aria-label={speaking ? "Stop reading" : `Read ${label} aloud`} title={speaking ? "Stop reading" : "Read aloud"}>
      <span aria-hidden="true">{speaking ? "⏹" : "🔊"}</span>
    </button>
  );
}
