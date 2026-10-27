"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ language, filename, children }: { language?: string; filename?: string; children: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(children.replace(/\n$/, ""));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="code-wrap">
      <div className="code-head"><span>{filename ? `${filename} · ` : ""}{language || "text"}</span><button className="copy-button" onClick={copy} type="button" aria-label={copied ? "Code copied" : "Copy code"} aria-live="polite">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button></div>
      <pre><code>{children}</code></pre>
    </div>
  );
}
