import { expect, test } from "@playwright/test";

const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

test("platform administrator can create and fully manage company knowledge", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  test.skip(!adminEmail || !adminPassword, "Administrator credentials are required for the control-plane journey.");
  const initialSignIn = await page.request.post("/api/auth/sign-in/email", { data: { email: adminEmail, password: adminPassword } });
  expect(initialSignIn.status()).toBe(200);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin(?:\/)?$/, { timeout: 30_000 });

  await page.goto("/admin/articles/new?type=WORKFLOW");
  await expect(page.getByRole("heading", { name: "New knowledge" })).toBeVisible();
  const workflowTitle = `E2E admin workflow ${testInfo.project.name}`;
  await page.getByLabel("Title").fill(workflowTitle);
  await page.getByLabel("Description").fill("Temporary governed workflow created to verify the complete administrator control path.");
  await page.getByRole("button", { name: /Create draft and open editor/i }).click();
  await expect(page).toHaveURL(/\/admin\/articles\/[a-z0-9]+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: workflowTitle })).toBeVisible();
  await expect(page.getByLabel("Content type")).toHaveValue("WORKFLOW");

  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") await dialog.accept(workflowTitle);
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
  await expect(page.getByRole("button", { name: /^Save$/ }).first()).toBeVisible();

  await page.goto("/admin/users");
  const currentUserRow = page.getByRole("row").filter({ hasText: "Current administrator account" });
  const updatedEmail = "e2e-admin-audit-updated@codefyhub.local";
  await currentUserRow.getByLabel("Email").fill(updatedEmail);
  await currentUserRow.getByRole("button", { name: /Save & sign in again/i }).click();
  await expect(page).toHaveURL(/\/admin\/sign-in\?emailChanged=1$/, { timeout: 30_000 });
  await expect(page.getByText(/Administrator email updated/i)).toBeVisible();
  const updatedSignIn = await page.request.post("/api/auth/sign-in/email", { data: { email: updatedEmail, password: adminPassword } });
  expect(updatedSignIn.status()).toBe(200);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin(?:\/)?$/, { timeout: 30_000 });
});
