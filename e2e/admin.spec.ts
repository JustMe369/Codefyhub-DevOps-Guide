import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

test("platform administrator can create and fully manage company knowledge", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  test.skip(!adminEmail || !adminPassword, "Administrator credentials are required for the control-plane journey.");
  const initialSignIn = await page.request.post("/api/auth/sign-in/email", { data: { email: adminEmail, password: adminPassword } });
  expect(initialSignIn.status()).toBe(200);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin(?:\/)?$/, { timeout: 30_000 });
  const adminAccessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(adminAccessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);

  await page.goto("/admin/articles/new?type=FAQ");
  await expect(page.getByRole("heading", { name: "New knowledge" })).toBeVisible();
  const articleTitle = `E2E admin article ${testInfo.project.name}`;
  await page.getByLabel("Title").fill(articleTitle);
  await page.getByLabel("Description").fill("Temporary governed article created to verify the complete administrator control path.");
  await page.getByRole("radio", { name: /Selected workspace/i }).check();
  await page.getByRole("button", { name: /Create draft and open editor/i }).click();
  await expect(page).toHaveURL(/\/admin\/articles\/[a-z0-9]+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: articleTitle })).toBeVisible();
  const editorAccessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(editorAccessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  await expect(page.getByLabel("Content type")).toHaveValue("FAQ");

  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") await dialog.accept(articleTitle);
    else await dialog.accept();
  });
  await page.getByRole("button", { name: /Delete permanently/i }).click();
  await expect(page).toHaveURL(/\/admin\/articles$/, { timeout: 30_000 });

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await expect(page.getByText(/change your administrator email/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Save/ }).first()).toBeVisible();

  await page.goto("/admin/companies");
  await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Save/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete/ }).first()).toBeVisible();

  await page.goto("/admin/roles");
  await expect(page.getByRole("button", { name: /Save role/ }).first()).toBeVisible();

  await page.goto("/admin/sources");
  await expect(page.getByRole("button", { name: /Save/ }).first()).toBeVisible();

  await page.goto("/admin/taxonomy");
  await expect(page.getByRole("button", { name: /Save/ }).first()).toBeVisible();

  await page.goto("/admin/members");
  await expect(page.getByRole("heading", { name: "Link existing account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Link user to company" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invite new person" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Save$/ }).first()).toBeVisible();
  const linkStatuses = await page.evaluate(async ({ email }) => {
    const directory = await fetch("/api/admin/members").then((response) => response.json()) as { roles: Array<{ id: string }> };
    const roleId = directory.roles[0].id;
    const duplicate = await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "LINK", email, roleId }) });
    const unknown = await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "LINK", email: `missing-${Date.now()}@codefyhub.local`, roleId }) });
    return { duplicate: duplicate.status, unknown: unknown.status };
  }, { email: adminEmail! });
  expect(linkStatuses).toEqual({ duplicate: 409, unknown: 404 });

  await page.goto("/admin/users");
  const currentUserRow = page.getByRole("row").filter({ hasText: "Current administrator account" });
  await expect(currentUserRow.getByLabel("Email")).toHaveValue(adminEmail!);
  await expect(currentUserRow.getByRole("button", { name: /Save & sign in again/i })).toBeVisible();
});
