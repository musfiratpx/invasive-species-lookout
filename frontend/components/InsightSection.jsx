/**
 * One text section written from our sources (summary, history, seasons, report).
 * If the sources don't cover it, the API sends null and we say so honestly.
 * A blank line in the text starts a new paragraph.
 *
 * With a `heading`, the section gets a small subheading with a ▶ button right next to it
 * that reads the whole section aloud (ReadAloud.jsx). Without one, the ▶ sits after the text.
 */

import ReadAloud from "@/components/ReadAloud";

export default function InsightSection({ heading, text }) {
  const paragraphs = text ? text.split(/\n\s*\n/) : [];
  const listen = text && <ReadAloud text={paragraphs.join(" ")} label={heading ? `“${heading}”` : "this text"} />;
  return (
    <>
      {heading && <h4>{heading} {listen}</h4>}
      {text
        ? paragraphs.map((paragraph, i) => (
            <p key={i}>
              {paragraph}
              {!heading && i === paragraphs.length - 1 && <> {listen}</>}
            </p>
          ))
        : <p className="muted">No information in our sources yet.</p>}
    </>
  );
}
