"use client";

import { useState } from "react";

export function KnowledgeGapCapture({ query }: { query: string }) {
  const [message, setMessage] = useState("");
  async function capture() {
    const response = await fetch("/api/admin/knowledge-gaps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, context: "No satisfactory company-search result" }) });
    const payload = await response.json();
    setMessage(response.ok ? "Added to the company knowledge-gap queue." : payload.error ?? "Could not capture this gap.");
  }
  return <div className="admin-empty"><p>Couldn’t find the answer?</p><button className="admin-primary-button" type="button" onClick={capture}>Request verified knowledge</button>{message && <p>{message}</p>}</div>;
}
