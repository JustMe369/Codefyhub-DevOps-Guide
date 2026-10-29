import { expect, test } from "@playwright/test";

const memberEmail = process.env.MEMBER_TEST_EMAIL;
const memberPassword = process.env.MEMBER_TEST_PASSWORD;

test("active company member can sign in and read the private knowledge bank", async ({ page }) => {
  test.skip(!memberEmail || !memberPassword, "A temporary local member fixture is required for the authenticated portal journey.");
  await page.goto("/portal/sign-in");
  await page.getByLabel("Company email").pressSequentially(memberEmail!);
  await page.getByLabel("Password").pressSequentially(memberPassword!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/portal(?:\/)?$/);
  await expect(page.getByRole("heading", { name: /Everything your company knows/i })).toBeVisible();
  await expect(page.getByText("Approved and current documents only")).toBeVisible();
  await page.goto("/portal/knowledge?type=FAQ");
  await expect(page.getByRole("heading", { name: "Questions & answers" })).toBeVisible();
});

test("company portal protects knowledge and presents member sign-in", async ({ page }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Open your knowledge bank" })).toBeVisible();
  await expect(page.getByLabel("Company email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByText(/answers, policies, and solutions/i)).toBeVisible();
});

test("company context endpoint rejects unauthenticated switching", async ({ page }) => {
  await page.goto("/portal/sign-in");
  const status = await page.evaluate(async () => {
    const response = await fetch("/api/portal/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: "another-company" }),
    });
    return response.status;
  });
  expect(status).toBe(401);
});

test("public navigation exposes the company portal entry", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
  await expect(page.getByRole("link", { name: "Company portal" })).toHaveAttribute("href", "/portal");
});
