import { prisma } from "@/lib/prisma";

export const metadata = { title: "Glossary" };

export default async function GlossaryPage() {
  const terms = await prisma.glossaryTerm.findMany({ where: { company: { isPublic: true, status: "ACTIVE" } }, orderBy: { term: "asc" } });
  return (
    <div className="shell glossary-page">
      <div className="eyebrow">Shared vocabulary</div>
      <h1>Infrastructure glossary</h1>
      <p>Short, operational definitions for terms used throughout the field guide.</p>
      <dl className="glossary-list">
        {terms.map((item) => <div className="glossary-item" id={item.id} key={item.id}><dt>{item.term}</dt><dd>{item.definition}</dd></div>)}
      </dl>
    </div>
  );
}
