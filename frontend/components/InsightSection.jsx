/**
 * One text section written from our sources (summary, history, seasons, report).
 * If the sources don't cover it, the API sends null and we say so honestly.
 * A blank line in the text starts a new paragraph. Each paragraph ends with a small 🔊
 * button that reads just that paragraph aloud (ReadAloud.jsx).
 */

import ReadAloud from "@/components/ReadAloud";

export default function InsightSection({ title, text }) {
  const body = text ? (
    text.split(/\n\s*\n/).map((paragraph, i) => (
      <p key={i}>
        {paragraph} <ReadAloud text={paragraph} />
      </p>
    ))
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
