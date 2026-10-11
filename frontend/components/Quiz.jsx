"use client";
/**
 * "Spot the species": a 10-question photo quiz (opened from the 🎯 Quiz button in the header).
 * Each question shows a real, openly licensed iNaturalist photo with its credit, and three
 * species to choose from. After each answer: the right name, its danger level, and a
 * "Learn more" button that opens that species on the map. Dots at the top show how far
 * along you are and which you got right. Keys 1, 2 and 3 pick an answer. At the end: the
 * species you missed (each with "Learn more"), and "Copy my score", which copies a short
 * message with a link that opens this quiz (?quiz=1). Nothing is saved.
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
  const [results, setResults] = useState([]); // one { species, correct } per answered question this round
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
    setResults([]);
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
    if (chosenId !== null) return; // already answered (e.g. a key pressed twice)
    setChosenId(id);
    setResults((r) => [...r, { species: question.answer, correct: id === question.answer.species_id }]);
  }

  // Keyboard flow: a new question focuses the first choice; an answer focuses "Next".
  // Also when the quiz comes back after "Learn more", so you carry on where you were.
  useEffect(() => {
    if (!question || hidden) return;
    if (chosenId === null) firstChoice.current?.focus();
    else nextButton.current?.focus();
  }, [question, chosenId, hidden]);

  // Escape closes only this dialog (stopPropagation keeps a side panel behind it open).
  // Keys 1, 2 and 3 pick that answer.
  function onKeyDown(event) {
    const choice = question && chosenId === null && question.choices[Number(event.key) - 1];
    if (choice && event.target.tagName !== "TEXTAREA") {
      answer(choice.species_id);
      return;
    }
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onClose();
  }

  const answered = chosenId !== null;
  const right = results.filter((r) => r.correct).length;
  const number = asked.size; // which question this is
  const finished = answered && number >= ROUND_LENGTH;

  return (
    <div className="dialog-backdrop" hidden={hidden} onClick={onClose} onKeyDown={onKeyDown}>
      <div className="dialog quiz" role="dialog" aria-modal="true" aria-labelledby="quiz-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeButton} className="sidebar-close" onClick={onClose} aria-label="Close quiz">✕</button>
        <h2 id="quiz-title"><span aria-hidden="true">◎</span> Spot the species</h2>

        {error && (
          <div role="alert">
            <p>{error}</p>
            <button onClick={load}>Try again</button>
          </div>
        )}
        {!error && !question && <p className="muted">Loading photos…</p>}

        {question && (
          <>
            <div className="quiz-progress">
              <p className="muted">
                Question {number} of {ROUND_LENGTH} · Score: {right} of {results.length}
              </p>
              <ProgressDots results={results} current={number} />
            </div>
            {/* Photo on the left, answers on the right (stacked on phones), so nobody has to scroll to answer. */}
            <div className="quiz-body">
            <QuizPhoto photo={question.photo} />
            <div className="quiz-answers">

            <p><strong>Which invasive species is this?</strong> <span className="muted quiz-keys-hint">(or press 1, 2 or 3)</span></p>
            <div className="quiz-choices" role="group" aria-label="Answer choices">
              {question.choices.map((s, i) => {
                const isAnswer = s.species_id === question.answer.species_id;
                const mark = !answered ? "" : isAnswer ? "✓ " : s.species_id === chosenId ? "✗ " : "";
                const state = !answered ? "" : isAnswer ? " right" : s.species_id === chosenId ? " wrong" : "";
                return (
                  <button key={s.species_id} ref={i === 0 ? firstChoice : null} className={`quiz-choice${state}`}
                          onClick={() => answer(s.species_id)} disabled={answered}>
                    <span className="quiz-key" aria-hidden="true">{i + 1}</span>
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

            </div>
            </div>

            {finished && <RoundOver results={results} onPlayAgain={() => startRound()} onLearnMore={onLearnMore} nextButton={nextButton} />}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * One dot per question: ✓ green when right, ✗ red when wrong, outlined for the current
 * question, empty for the ones still to come. Marks as well as color, for color-blind players.
 */
function ProgressDots({ results, current }) {
  return (
    <ol className="quiz-dots" aria-label={`Question ${current} of ${ROUND_LENGTH}, ${results.filter((r) => r.correct).length} right so far`}>
      {Array.from({ length: ROUND_LENGTH }, (_, i) => {
        const result = results[i];
        const state = result ? (result.correct ? "right" : "wrong") : i + 1 === current ? "current" : "";
        return (
          <li key={i} className={`quiz-dot ${state}`} aria-hidden="true">
            {result && <DotMark correct={result.correct} />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * ✓ or ✗ drawn as a tiny shape rather than a text character: font characters sit a little
 * off-center in a circle, a shape can be centered exactly.
 */
function DotMark({ correct }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={correct ? "M2.5 6.2l2.3 2.3L9.5 3.8" : "M3 3l6 6M9 3l-6 6"} />
    </svg>
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

function RoundOver({ results, onPlayAgain, onLearnMore, nextButton }) {
  const right = results.filter((r) => r.correct).length;
  const perfect = right === ROUND_LENGTH;
  const missed = results.filter((r) => !r.correct).map((r) => r.species);
  return (
    <div className="quiz-end">
      <p>
        <strong>You got {right} of {ROUND_LENGTH}.</strong>{" "}
        {perfect ? "Perfect! You'd make a great invasive species spotter." : "Every photo you study makes the next sighting easier to spot."}
      </p>
      {missed.length > 0 && (
        <>
          <p><strong>Ones to study:</strong></p>
          <ul className="quiz-missed">
            {missed.map((s) => (
              <li key={s.species_id}>
                {nameOf(s)} <em className="muted">{s.scientific_name}</em>{" "}
                <button className="link-button" onClick={() => onLearnMore(s.species_id)}>Learn more</button>
              </li>
            ))}
          </ul>
        </>
      )}
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
 * Invasive Species Lookout quiz. Can you beat me? <link>". No accounts, nothing sent anywhere.
 */
function CopyScore({ right }) {
  const [status, setStatus] = useState(null); // null, "copied" or "manual"
  const link = `${siteUrl()}/?quiz=1`;
  const message = `I spotted ${right} of ${ROUND_LENGTH} NYC invasive species in the Invasive Species Lookout quiz. Can you beat me? ${link}`;

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
