import { describe, expect, it } from "vitest";
import { createWorkflowPdf } from "./workflow-pdf";

describe("workflow PDF generation", () => {
  it("creates a non-empty PDF from Markdown workflow content", async () => {
    const pdf = await createWorkflowPdf({
      title: "VPN deployment workflow",
      description: "A verified workflow used to test the downloadable PDF generator.",
      body: "## Objective\n\nDeploy the approved VPN client safely.\n\n## Procedure\n\n1. Create the client.\n2. Validate connectivity.\n\n```bash\nwg show\n```",
      sectionTitle: "Secure networking",
      verifiedBy: "Operations",
      verificationMethod: "Reviewed and tested in the approved environment.",
      lastVerifiedAt: new Date("2026-11-01T07:55:59.000Z"),
      sources: [],
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5_000);
    expect(pdf.subarray(-20).toString()).toContain("%%EOF");
  });

  it("embeds Arabic workflow text without failing PDF generation", async () => {
    const pdf = await createWorkflowPdf({
      title: "سير عمل نشر الشبكة الخاصة",
      description: "إجراء موثق وآمن لنشر اتصال الشبكة الخاصة والتحقق منه.",
      body: "## الهدف\n\nنشر الاتصال بطريقة آمنة.\n\n## الخطوات\n\n1. أنشئ إعداد المستخدم.\n2. تحقق من الاتصال.",
      sectionTitle: "الشبكات الآمنة",
      verifiedBy: "فريق العمليات",
      verificationMethod: "مراجعة الوثائق والتحقق في بيئة معتمدة.",
      lastVerifiedAt: new Date("2026-11-01T07:55:59.000Z"),
      sources: [],
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5_000);
  });
});
