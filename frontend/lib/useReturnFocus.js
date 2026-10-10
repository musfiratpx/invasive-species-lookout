/**
 * When a panel or dialog closes, put keyboard focus back on whatever opened it
 * (a search result, a Browse row, the header button...). Without this, focus falls
 * to the top of the page and keyboard and screen-reader users lose their place.
 */

import { useLayoutEffect } from "react";

export function useReturnFocus() {
  // A layout effect runs right after the panel appears, before the panel moves focus
  // to its own close button, so `document.activeElement` is still the thing that opened it.
  useLayoutEffect(() => {
    const opener = document.activeElement;
    return () => {
      // Only if that element is still on the page (it may have closed too).
      if (opener && opener !== document.body && document.contains(opener)) opener.focus();
    };
  }, []);
}
