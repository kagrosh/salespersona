"use client";

import { useState } from "react";

export function QuickStart() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <aside className="quick-start">
      <div><strong>Start with what you know.</strong> Fields marked <span className="key-tag">key</span> matter most. Save your changes, generate a strategy, then review the ask and draft. Add detail as you learn more.</div>
      <button type="button" className="btn-secondary btn-sm shrink-0" onClick={() => setDismissed(true)}>Got it</button>
    </aside>
  );
}
