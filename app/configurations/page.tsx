import Link from "next/link";

export const metadata = { title: "Configuration artifacts", description: "Reviewed, reusable infrastructure configuration with installation, validation, and rollback instructions." };

export default function ConfigurationsPage() {
  return (
    <div className="shell index-page">
      <div className="eyebrow">Reusable artifacts</div>
      <h1>Configuration recipes</h1>
      <p>Every artifact includes applicability, placeholders, installation, validation, and rollback guidance. Review it before use; examples are not production credentials.</p>
      <div className="index-grid">
        <Link href="/configurations/mdadm-monitoring"><span>Source-reviewed</span><h2>mdadm monitoring recipe</h2><p>Array assembly identity and alert-delivery starting point for Ubuntu Server.</p></Link>
      </div>
    </div>
  );
}
