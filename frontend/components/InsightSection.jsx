/**
 * One text section written from our sources (summary, history, seasons).
 * If the sources don't cover it, the API sends null and we say so honestly.
 */

export default function InsightSection({ title, text }) {
  const body = text ? <p>{text}</p> : <p className="muted">No information in our sources yet.</p>;
  if (!title) return body;
  return (
    <section>
      <h3>{title}</h3>
      {body}
    </section>
  );
}
