"use client";
/**
 * "Spot the species": a 10-question photo quiz (opened from the 🎯 Quiz button in the header).
 * Each question shows a real, openly licensed iNaturalist photo with its credit, and three
 * species to choose from. After each answer: the right name, its danger level, and a
 * "Learn more" button that opens that species on the map. Nothing is saved; at the end,
 * "Copy my score" copies a short message with a link that opens this quiz (?quiz=1).
 * While you look at that species the page hides the quiz ("hidden") instead of closing it,
 * so the question and score are still there when you come back.
 */

import { useEffect, useRef, useState } from "react";

import { getQuiz } from "@/lib/api";
import { photographerOf } from "@/lib/credits";
import { DANGER_COLORS } from "@/lib/labels";
import { ROUND_LENGTH, makeQuestion } from "@/lib/quiz";
import { isLocalOnly, siteUrl } from "@/lib/site";
import { useReturnFocus } from "@/lib/useReturnFocus";

const nameOf = (s) => s.common_name || s.scientific_name;

export default function Quiz({ hidden, onClose, onLearnMore }) {
  const [species, setSpecies] = useState(null);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState(null);
  const [chosenId, setChosenId] = useState(null); // null until this question is answered
  const [asked, setAsked] = useState(new Set()); // species asked this round
  const [right, setRight] = useState(0);
  const firstChoice = useRef(null);
  const nextButton = useRef(null);
  const closeButton = useRef(null);
  useReturnFocus();

  function load() {
    setError(null);
    getQuiz()
      .then((rows) => {
        setSpecies(rows);
        startRound(rows);
      })
      .catch(() => setError("Couldn't load the quiz. Is the backend running?"));
  }

  useEffect(() => {
    closeButton.current?.focus();
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startRound(rows = species) {
    setRight(0);
    setChosenId(null);
    const first = makeQuestion(rows, new Set());
    setAsked(new Set([first.answer.species_id]));
    setQuestion(first);
  }

  function nextQuestion() {
    const next = makeQuestion(species, asked);
    setAsked(new Set([...asked, next.answer.species_id]));
    setChosenId(null);
    setQuestion(next);
  }

  function answer(id) {
    setChosenId(id);
    if (id === question.answer.species_id) setRight((r) => r + 1);
  }

  // Keyboard flow: a new question focuses the first choice; an answer focuses "Next".
  // Also when the quiz comes back after "Learn more", so you carry on where you were.
  useEffect(() => {
    if (!question || hidden) return;
    if (chosenId === null) firstChoice.current?.focus();
    else nextButton.current?.focus();
  }, [question, chosenId, hidden]);

  // Escape closes only this dialog (stopPropagation keeps a side panel behind it open).
  function onKeyDown(event) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onClose();
  }

  const answered = chosenId !== null;
  const number = asked.size; // which question this is
  const finished = answered && number >= ROUND_LENGTH;

  return (
    <div className="dialog-backdrop" hidden={hidden} onClick={onClose} onKeyDown={onKeyDown}>
      <div className="dialog quiz" role="dialog" aria-modal="true" aria-labelledby="quiz-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeButton} className="sidebar-close" onClick={onClose} aria-label="Close quiz">✕</button>
        <h2 id="quiz-title">🎯 Spot the species</h2>

        {error && (
          <div role="alert">
            <p>{error}</p>
            <button onClick={load}>Try again</button>
          </div>
        )}
        {!error && !question && <p className="muted">Loading photos…</p>}

        {question && (
          <>
            <p className="muted">
              Question {number} of {ROUND_LENGTH} · Score: {right} of {number - (answered ? 0 : 1)}
            </p>
            <QuizPhoto photo={question.photo} />

            <p><strong>Which invasive species is this?</strong></p>
            <div className="quiz-choices" role="group" aria-label="Answer choices">
              {question.choices.map((s, i) => {
                const isAnswer = s.species_id === question.answer.species_id;
                const mark = !answered ? "" : isAnswer ? "✓ " : s.species_id === chosenId ? "✗ " : "";
                const state = !answered ? "" : isAnswer ? " right" : s.species_id === chosenId ? " wrong" : "";
                return (
                  <button key={s.species_id} ref={i === 0 ? firstChoice : null} className={`quiz-choice${state}`}
                          onClick={() => answer(s.species_id)} disabled={answered}>
                    {mark}{nameOf(s)} <em>{s.scientific_name}</em>
                  </button>
                );
              })}
            </div>

            {/* Read out by screen readers as soon as it appears. */}
            <div role="status">
              {answered && <Feedback answer={question.answer} correct={chosenId === question.answer.species_id} />}
            </div>

            {answered && (
              <p className="quiz-actions">
                <button onClick={() => onLearnMore(question.answer.species_id)}>Learn more about it</button>
                {finished ? null : <button ref={nextButton} className="quiz-next" onClick={nextQuestion}>Next photo →</button>}
              </p>
            )}

            {finished && <RoundOver right={right} onPlayAgain={() => startRound()} nextButton={nextButton} />}
          </>
        )}
      </div>
    </div>
  );
}

/** The photo, with its credit and observation link (required for every photo we show). */
function QuizPhoto({ photo }) {
  const name = photographerOf(photo.attribution);
  // The alt text names the photographer but not the species: that would give the answer away.
  const alt = name ? `Quiz photo, photographed by ${name} on iNaturalist` : "Quiz photo from iNaturalist";
  return (
    <figure className="quiz-photo">
      <img key={photo.url} src={photo.url} alt={alt} />
      <figcaption className="caption">
        {photo.attribution} ·{" "}
        <a href={photo.observation_url} target="_blank" rel="noreferrer">iNaturalist observation</a>
      </figcaption>
    </figure>
  );
}

function Feedback({ answer, correct }) {
  return (
    <p className={correct ? "quiz-feedback right" : "quiz-feedback wrong"}>
      {correct ? "✓ Right! " : "✗ Not quite. "}It's <strong>{nameOf(answer)}</strong> (<em>{answer.scientific_name}</em>).{" "}
      <span className="danger-cell quiz-danger">
        <span className="swatch" style={{ background: DANGER_COLORS[answer.danger_level ?? null] }} aria-hidden="true" />
        Danger: {answer.danger_label}
      </span>
    </p>
  );
}

function RoundOver({ right, onPlayAgain, nextButton }) {
  const perfect = right === ROUND_LENGTH;
  return (
    <div className="quiz-end">
      <p>
        <strong>You got {right} of {ROUND_LENGTH}.</strong>{" "}
        {perfect ? "Perfect! You'd make a great invasive species spotter." : "Every photo you study makes the next sighting easier to spot."}
      </p>
      <p className="quiz-actions quiz-end-actions">
        <button ref={nextButton} className="quiz-next" onClick={onPlayAgain}>Play again</button>
        <CopyScore right={right} />
      </p>
      {perfect && <Confetti />}
    </div>
  );
}

/**
 * "Copy my score": copies e.g. "I spotted 8 of 10 NYC invasive species in the
 * Kissena Invasive Watch quiz. Can you beat me? <link>". No accounts, nothing sent anywhere.
 */
function CopyScore({ right }) {
  const [status, setStatus] = useState(null); // null, "copied" or "manual"
  const link = `${siteUrl()}/?quiz=1`;
  const message = `I spotted ${right} of ${ROUND_LENGTH} NYC invasive species in the Kissena Invasive Watch quiz. Can you beat me? ${link}`;

  function copy() {
    // The clipboard only works on https:// or localhost; otherwise show the text to copy by hand.
    if (!navigator.clipboard) return setStatus("manual");
    navigator.clipboard.writeText(message).then(() => setStatus("copied"), () => setStatus("manual"));
  }

  return (
    <>
      <button onClick={copy}>📋 Copy my score</button>
      {/* Screen readers announce "Copied" when it works. */}
      <span role="status" className="muted">{status === "copied" ? " Copied! Paste it anywhere to share." : ""}</span>
      {status === "manual" && (
        <textarea className="quiz-share-text" readOnly value={message} aria-label="Your score message, to copy"
                  onFocus={(e) => e.target.select()} autoFocus />
      )}
      {isLocalOnly(link) && (
        <span className="muted quiz-share-note">
          (The link points to this computer. Set NEXT_PUBLIC_SITE_URL once the app is online.)
        </span>
      )}
    </>
  );
}

/** A small celebration for a perfect round. Decorative only, so hidden from screen readers. */
function Confetti() {
  const pieces = ["🎉", "🌿", "🐝", "🍃", "✨", "🌼", "🎉", "🍂", "✨", "🌿", "🐞", "🎉"];
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, i) => (
        <span key={i} style={{ left: `${(i * 97) % 100}%`, animationDelay: `${(i % 6) * 0.12}s` }}>{piece}</span>
      ))}
    </div>
  );
}
