/**
 * The app's public web address, for links people take elsewhere (QR codes on the
 * printed field guide, the quiz's "Copy my score" text).
 * Set NEXT_PUBLIC_SITE_URL in .env.local once the app is online; until then it's this
 * browser's address, which may be "localhost" (only works on this computer).
 */

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
}

/** True for addresses that only work on this computer, so nobody else can open the link. */
export const isLocalOnly = (url) => /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url);
