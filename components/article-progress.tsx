"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

export function ArticleProgress({ articleId }: { articleId: string }) {
  const key = "devops-guide:completed";
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      setDone(saved.includes(articleId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [articleId]);
  function toggle() {
    const saved = new Set(JSON.parse(localStorage.getItem(key) || "[]") as string[]);
    if (saved.has(articleId)) saved.delete(articleId); else saved.add(articleId);
    localStorage.setItem(key, JSON.stringify([...saved]));
    setDone(saved.has(articleId));
  }
  return <button className="button" type="button" onClick={toggle}>{done ? <CheckCircle2 size={16} /> : <Circle size={16} />}{done ? "Completed" : "Mark complete"}</button>;
}
