import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import { Download } from "lucide-react";
import { CodeBlock } from "@/components/code-block";

export const metadata = {
  title: "mdadm monitoring configuration",
  description: "A reviewed mdadm.conf starting point with safe placeholders, installation, verification, and rollback guidance."
};

export default async function MdadmMonitoringConfigurationPage() {
  const artifact = await readFile(join(process.cwd(), "public", "configurations", "mdadm-monitoring.conf"), "utf8");
  return (
    <article className="shell artifact-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/configurations">Configurations</Link><span>/</span><span>mdadm monitoring</span></nav>
      <header>
        <div className="eyebrow">Configuration recipe · Source-reviewed</div>
        <h1>mdadm monitoring recipe</h1>
        <p>Use this artifact as a reviewed starting point for array assembly identity and alert routing on Ubuntu Server 24.04 LTS with mdadm 4.x.</p>
        <a className="button button-primary" href="/configurations/mdadm-monitoring.conf" download><Download size={16} />Download mdadm-monitoring.conf</a>
      </header>
      <section className="doc-panel"><h2>Placeholders</h2><ul><li><code>storage-alerts@example.invalid</code>: replace with a monitored address whose delivery path is tested.</li><li><code>&lt;array-uuid&gt;</code>: generate on the target host with <code>sudo mdadm --detail --scan</code>.</li><li><code>&lt;host&gt;</code>: use the array name emitted on the target host; do not copy another host’s identity.</li></ul></section>
      <CodeBlock language="conf" filename="/etc/mdadm/mdadm.conf">{artifact}</CodeBlock>
      <section className="prose">
        <h2>Install</h2>
        <p>Back up the existing file, merge the reviewed settings instead of overwriting unrelated arrays, then regenerate initramfs.</p>
        <CodeBlock language="bash">{"sudo install -m 0600 /etc/mdadm/mdadm.conf /etc/mdadm/mdadm.conf.before-codefyhub\nsudoedit /etc/mdadm/mdadm.conf\nsudo mdadm --detail --scan\nsudo update-initramfs -u"}</CodeBlock>
        <h2>Verify</h2>
        <CodeBlock language="bash">{"sudo mdadm --assemble --scan --verbose\nsudo mdadm --detail /dev/md0\nsystemctl status mdmonitor.service --no-pager"}</CodeBlock>
        <p>Expected outcome: the intended array assembles, both recorded members appear, and the monitor service is active. Trigger a controlled test notification through the environment’s approved mail or alert integration before relying on it.</p>
        <h2>Rollback</h2>
        <p>Restore <code>/etc/mdadm/mdadm.conf.before-codefyhub</code>, regenerate initramfs, and verify assembly during an approved maintenance window. Restoring configuration does not undo member replacement or filesystem writes.</p>
      </section>
      <p><Link className="button" href="/guides/storage-raid/mdadm-zfs">Return to the implementation guide</Link></p>
    </article>
  );
}
