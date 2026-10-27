import Link from "next/link";
import { CheckCircle2, FlaskConical, ShieldAlert } from "lucide-react";

export type RelatedGuide = { href: string; title: string; description: string };

const contentTypeLabels: Record<string, string> = {
  CONCEPT: "Concept",
  HOW_TO: "How-to guide",
  RUNBOOK: "Runbook",
  REFERENCE: "Reference",
  CONFIGURATION_RECIPE: "Configuration recipe",
  LEARNING_PATH: "Learning path"
};

export function ContentMetadata({
  contentType,
  validationStatus,
  platforms,
  versions,
  prerequisites,
  tags,
  relatedGuides,
  testedAt,
  testEnvironment
}: {
  contentType: string;
  validationStatus: string;
  platforms: string[];
  versions: string[];
  prerequisites: string[];
  tags: string[];
  relatedGuides: RelatedGuide[];
  testedAt: Date | null;
  testEnvironment: string | null;
}) {
  const validation = validationStatus === "LAB_TESTED"
    ? { label: "Lab-tested", Icon: FlaskConical, note: testedAt && testEnvironment ? `Executed ${testedAt.toISOString().slice(0, 10)} in ${testEnvironment}.` : "Lab evidence is incomplete." }
    : validationStatus === "SOURCE_REVIEWED"
      ? { label: "Source-reviewed", Icon: CheckCircle2, note: "Checked against first-party documentation; not executed for this publication." }
      : { label: "Draft", Icon: ShieldAlert, note: "Technical review and execution evidence are pending." };

  return (
    <>
      <div className="content-badges" aria-label="Content classification">
        <span>{contentTypeLabels[contentType] ?? contentType.toLowerCase()}</span>
        <span className={`validation-badge validation-${validationStatus.toLowerCase().replace("_", "-")}`}><validation.Icon size={14} />{validation.label}</span>
        {platforms.map((platform) => <span key={platform}>{platform}</span>)}
        {versions.map((version) => <span key={version}>{version}</span>)}
      </div>
      <p className="validation-explanation">{validation.note}</p>
      {prerequisites.length > 0 && (
        <section className="doc-panel prerequisites" aria-labelledby="prerequisites-title">
          <h2 id="prerequisites-title">Prerequisites</h2>
          <ul>{prerequisites.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}
      {tags.length > 0 && <div className="article-tags" aria-label="Article tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      <RelatedGuides guides={relatedGuides} />
    </>
  );
}

export function RelatedGuides({ guides }: { guides: RelatedGuide[] }) {
  if (guides.length === 0) return null;
  return (
    <section className="related-guides" aria-labelledby="related-guides-title">
      <h2 id="related-guides-title">Related guides</h2>
      <div>{guides.map((guide) => <Link href={guide.href} key={guide.href}><strong>{guide.title}</strong><span>{guide.description}</span></Link>)}</div>
    </section>
  );
}
