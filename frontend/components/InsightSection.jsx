/**
 * One text section written from our sources (summary, history, seasons, report).
 * If the sources don't cover it, the API sends null and we say so honestly.
 * A blank line in the text starts a new paragraph.
 * foundBy (optional) adds a small line saying which search found the text and where.
 */

import FoundBy from "@/components/FoundBy";

export default function InsightSection({ title, text, foundBy }) {
  const body = text ? (
    <>
      {text.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
      <FoundBy where={foundBy} />
    </>
  ) : (
    <p className="muted">No information in our sources yet.</p>
  );
  if (!title) return body;
  return (
    <section>
      <h3>{title}</h3>
      {body}
    </section>
  );
}
