"use client";
/**
 * "Copy link" button: copies a link that opens the app on this species (?species=ID),
 * so people can send it to a friend or a park group.
 * If the app is only running on this computer (localhost), it says the link won't work elsewhere.
 */

import { useState } from "react";

import { isLocalOnly, siteUrl } from "@/lib/site";

export default function CopyLink({ speciesId }) {
  const [message, setMessage] = useState("");

  async function copy() {
    const link = `${siteUrl()}/?species=${encodeURIComponent(speciesId)}`;
    try {
      await navigator.clipboard.writeText(link);
      setMessage(isLocalOnly(link) ? "Copied. (This link only works on this computer until the app is online.)" : "Link copied.");
    } catch {
      setMessage(`Couldn't copy. The link is: ${link}`); // e.g. the browser blocked clipboard access
    }
  }

  return (
    <>
      <button className="copy-link" onClick={copy}><span aria-hidden="true">🔗</span> Copy link</button>
      <span className="muted copy-link-status" role="status">{message}</span>
    </>
  );
}
