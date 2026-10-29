"use client";

import Link from "next/link";
import { useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";

type Props = {
  articleId: string;
  title: string;
  status: string;
  canEdit: boolean;
  canPermanentlyDelete: boolean;
};

export function ArticleRowActions({ articleId, title, status, canEdit, canPermanentlyDelete }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function update(action: "archive" | "restore" | "delete") {
    if (action === "archive" && !window.confirm(`Archive “${title}”? It can be restored later.`)) return;
    let confirmTitle: string | undefined;
    if (action === "delete") {
      confirmTitle = window.prompt(`Permanently delete “${title}”? This cannot be undone. Type the article title to confirm.`) ?? undefined;
      if (confirmTitle !== title) return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = action === "restore"
        ? await fetch(`/api/admin/articles/${articleId}/restore`, { method: "POST" })
        : await fetch(`/api/admin/articles/${articleId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action === "delete" ? { permanent: true, confirmTitle } : {}),
          });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "The action failed.");
        return;
      }
      window.location.reload();
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="article-row-actions">
    {canEdit && <Link className="admin-secondary-button" href={`/admin/articles/${articleId}`}>Edit</Link>}
    {canEdit && status !== "ARCHIVED" && <button type="button" className="admin-secondary-button" disabled={busy} onClick={() => update("archive")}><Archive size={13} /> Archive</button>}
    {canEdit && status === "ARCHIVED" && <button type="button" className="admin-secondary-button" disabled={busy} onClick={() => update("restore")}><RotateCcw size={13} /> Restore</button>}
    {canPermanentlyDelete && <button type="button" className="admin-secondary-button article-delete-action" disabled={busy} onClick={() => update("delete")}><Trash2 size={13} /> Delete</button>}
    {message && <span role="status" className="text-xs text-red-700">{message}</span>}
  </div>;
}
