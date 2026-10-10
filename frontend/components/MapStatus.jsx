/**
 * Messages shown on top of the map while it isn't showing sightings:
 *   - loading:  "Loading 14,620 sightings…" with a progress bar
 *   - error:    the data server can't be reached, with a "Try again" button
 *   - empty:    the filters hide everything, with a "Reset filters" button
 */

export default function MapStatus({ status, expected, progress, onRetry, onResetFilters }) {
  if (status === "loading") {
    return (
      <div className="map-status" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>
          <strong>Loading {expected ? expected.toLocaleString() : ""} sightings…</strong>
        </p>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="muted">{progress > 0 ? `${Math.round(progress * 100)}%` : "Connecting to the data server"}</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="map-status" role="alert">
        <p><strong>Can&apos;t reach the data server.</strong></p>
        <p className="muted">
          The map gets its sightings from our backend. If you&apos;re running the app yourself, start it with
          <code> uvicorn app.main:app</code> in the <code>backend</code> folder, then try again.
        </p>
        <button onClick={onRetry}>Try again</button>
      </div>
    );
  }
  if (status === "empty") {
    return (
      <div className="map-status map-status-small" role="status">
        <p><strong>No sightings match these filters.</strong></p>
        <button onClick={onResetFilters}>Reset filters</button>
      </div>
    );
  }
  return null;
}
