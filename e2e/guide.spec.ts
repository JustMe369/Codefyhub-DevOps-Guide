import { expect, test } from "@playwright/test";

test("search, lesson navigation, and readiness export are available", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Build infrastructure/i })).toBeVisible();
  await page.getByLabel("Search the guide").fill("cloud-init");
  await page.getByLabel("Search the guide").press("Enter");
  await expect(page.getByRole("heading", { name: /Create an Ubuntu Cloud-Init template/i })).toBeVisible();
  await page.getByRole("link", { name: /Create an Ubuntu Cloud-Init template/i }).click();
  await expect(page.getByRole("button", { name: "Copy code" }).first()).toBeVisible();
  await page.goto("/checklist");
  await expect(page.getByRole("button", { name: "Print / export PDF" })).toBeVisible();
});

test("assessment builder exposes a ready-to-start session", async ({ page }) => {
  await page.goto("/exam");
  await expect(page.getByText(/36 questions available/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start assessment" })).toBeEnabled();
});
