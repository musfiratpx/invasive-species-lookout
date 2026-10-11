/**
 * The top row of every side panel (species, park, Browse, Near you): a small uppercase
 * label like "SPECIES PROFILE / PLANT", an optional "← Back" link, and a plain ✕.
 * It stays pinned to the top while the panel scrolls. Once the panel's big title has
 * scrolled away, `stuckTitle` replaces the label, so you still see what you're reading.
 */

export default function PanelHead({ kicker, stuckTitle, onClose, closeRef, closeLabel, onBack, backLabel }) {
  return (
    <div className="panel-head">
      {onBack && (
        <button className="panel-back" onClick={onBack}>← {backLabel}</button>
      )}
      <p className={stuckTitle ? "panel-kicker panel-stuck-title" : "panel-kicker"}>{stuckTitle || kicker}</p>
      <button ref={closeRef} className="panel-close" onClick={onClose} aria-label={closeLabel}>✕</button>
    </div>
  );
}
