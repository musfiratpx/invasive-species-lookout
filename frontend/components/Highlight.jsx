/**
 * Shows text with the part that matches the search in bold, e.g. searching "mug" in
 * "Common mugwort" bolds "mug", so people see why a row matched.
 * Matching ignores upper/lower case, like the Browse search itself.
 */

export default function Highlight({ text, query }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="match">{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}
