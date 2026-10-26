import { ReadinessChecklist } from "@/components/readiness-checklist";

export const metadata = { title: "Production readiness" };

export default function ChecklistPage() {
  return (
    <div className="shell checklist-page">
      <div className="eyebrow">Operational gate</div>
      <h1>Production readiness review</h1>
      <p>This checklist is stored only in this browser. A checked box is a reminder, not proof—attach real evidence to your organization’s change record.</p>
      <ReadinessChecklist />
    </div>
  );
}
