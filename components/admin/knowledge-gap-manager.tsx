"use client";

import { useState } from "react";

type Gap = { id: string; query: string; context: string | null; status: "OPEN" | "PLANNED" | "RESOLVED" | "DISMISSED"; occurrenceCount: number; lastRequestedAt: string | Date; requestedBy: { name: string; email: string } | null; resolvedArticle: { id: string; title: string } | null };
type ArticleOption = { id: string; title: string };

export function KnowledgeGapManager({ initialRequests, articles }: { initialRequests: Gap[]; articles: ArticleOption[] }) {
  const [items, setItems] = useState(initialRequests);
  const [message, setMessage] = useState("");
  async function update(item: Gap, status: Gap["status"], resolvedArticleId = item.resolvedArticle?.id ?? null) {
    if (status === "RESOLVED" && !resolvedArticleId) {
      setMessage("Choose the verified article that resolves this gap.");
      return;
    }
    const response = await fetch(`/api/admin/knowledge-gaps/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, resolvedArticleId }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Update failed.");
    const resolvedArticle = resolvedArticleId ? articles.find((article) => article.id === resolvedArticleId) ?? null : null;
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status, resolvedArticle } : candidate));
    setMessage("Knowledge gap updated.");
  }
  return <section className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Question or gap</th><th>Demand</th><th>Status</th><th>Verified resolution</th><th>Last requested</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.query}</strong><span>{item.context || item.requestedBy?.email || "Company search"}</span></td><td>{item.occurrenceCount}</td><td><select aria-label={`Status for ${item.query}`} value={item.status} onChange={(event) => update(item, event.target.value as Gap["status"])}><option>OPEN</option><option>PLANNED</option><option>RESOLVED</option><option>DISMISSED</option></select></td><td><select aria-label={`Resolution for ${item.query}`} value={item.resolvedArticle?.id ?? ""} onChange={(event) => update(item, event.target.value ? "RESOLVED" : "OPEN", event.target.value || null)}><option value="">Not linked</option>{articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}</select></td><td>{new Date(item.lastRequestedAt).toLocaleDateString()}</td></tr>)}</tbody></table>{items.length === 0 && <p className="admin-empty">No knowledge gaps have been captured.</p>}{message && <p className="admin-manager-message" role="status">{message}</p>}</section>;
}
