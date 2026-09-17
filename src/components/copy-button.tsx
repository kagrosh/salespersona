"use client";

import { useState } from "react";

/**
 * The only client component in the app: copies a piece of text to the clipboard.
 * Copying never sends anything; the salesperson pastes it into their own channel.
 */
export function CopyButton({ text, label = "Copy", className = "btn-secondary btn-sm" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button type="button" className={className} onClick={copy} title="Copy to clipboard (nothing is sent)">
      {state === "copied" ? "Copied" : state === "failed" ? "Select and copy manually" : label}
    </button>
  );
}
