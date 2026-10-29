"use client";

import { FormEvent, useState } from "react";
import { FilePlus2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type SectionOption = { id: string; title: string };
type KnowledgeType = "FAQ" | "WORKFLOW" | "ISSUE_SOLUTION" | "POLICY";

const typeLabels: Record<KnowledgeType, string> = {
  FAQ: "Question & answer",
  WORKFLOW: "Workflow",
  ISSUE_SOLUTION: "Issue solution",
  POLICY: "Policy",
};

export function KnowledgeCreator({ sections, initialType = "WORKFLOW" }: { sections: SectionOption[]; initialType?: KnowledgeType }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/articles/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: form.get("sectionId"),
          contentType: form.get("contentType"),
          title: form.get("title"),
          description: form.get("description"),
        }),
      });
      const payload = await response.json() as { article?: { id: string }; error?: string };
      if (!response.ok || !payload.article) {
        setError(payload.error ?? "Knowledge creation failed.");
        return;
      }
      router.push(`/admin/articles/${payload.article.id}`);
      router.refresh();
    } catch {
      setError("The creation request could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  if (sections.length === 0) {
    return <section className="admin-panel admin-create-empty"><FilePlus2 size={22} /><div><h2>Create a section first</h2><p>Knowledge must belong to a company section. Add one from Structure, then return here.</p></div></section>;
  }

  return <section className="admin-panel admin-knowledge-create">
    <div className="admin-panel-heading"><div><h2><FilePlus2 size={18} /> Create company knowledge</h2><p>Start a structured draft, then complete its sources, review, and publication evidence.</p></div></div>
    <form onSubmit={createKnowledge}>
      <label>Knowledge type<select name="contentType" defaultValue={initialType}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Section<select name="sectionId" required>{sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label>
      <label className="admin-create-wide">Title<input name="title" required minLength={4} maxLength={160} placeholder="Example: Access the Ubuntu development environment" /></label>
      <label className="admin-create-wide">Description<textarea name="description" required minLength={20} maxLength={320} rows={3} placeholder="Explain what this knowledge helps employees accomplish." /></label>
      {error && <p className="admin-error admin-create-wide" role="alert">{error}</p>}
      <button className="admin-primary-button admin-create-wide" disabled={pending}>{pending ? <LoaderCircle className="admin-spin" size={17} /> : <FilePlus2 size={17} />} Create draft and open editor</button>
    </form>
  </section>;
}
