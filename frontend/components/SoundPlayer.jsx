/**
 * "How it sounds": a real recording from iNaturalist, with credit.
 * Renders NOTHING when sound is null (most species, since most are plants).
 * Recordings with no license are linked, not played, as reuse isn't allowed.
 */

export default function SoundPlayer({ sound }) {
  if (!sound) return null;

  return (
    <section>
      <h3>How it sounds</h3>
      {sound.license ? (
        <audio controls preload="none" src={sound.file_url} style={{ width: "100%" }}>
          <a href={sound.file_url}>Download the recording</a>
        </audio>
      ) : (
        <a href={sound.observation_url} target="_blank" rel="noreferrer">Listen on iNaturalist</a>
      )}
      {sound.observer_note && <p className="muted">Observer&apos;s note: &ldquo;{sound.observer_note}&rdquo;</p>}
      <p className="caption">
        {sound.attribution} ·{" "}
        <a href={sound.observation_url} target="_blank" rel="noreferrer">iNaturalist observation</a>
      </p>
    </section>
  );
}
