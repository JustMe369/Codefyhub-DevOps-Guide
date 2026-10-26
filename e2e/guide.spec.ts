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
  await expect(page.getByText(/48 questions available/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start assessment" })).toBeEnabled();
});

test("article metadata, security headers, keyboard access, and resilient storage work", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("devops-guide:readiness", JSON.stringify({ invalid: true }));
    localStorage.setItem("devops-guide:theme", "light");
  });
  const response = await page.goto("/guides/remote-access/beginner-remote-access");
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  await expect(page).toHaveTitle(/How to access a computer remotely/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /guides\/remote-access\/beginner-remote-access$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/checklist");
  await expect(page.getByText("0 of 18 controls reviewed")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
});

test("every URL published in the sitemap responds successfully", async ({ request }) => {
  test.setTimeout(120_000);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(urls.length).toBeGreaterThanOrEqual(70);
  for (let index = 0; index < urls.length; index += 8) {
    const batch = urls.slice(index, index + 8);
    const responses = await Promise.all(batch.map(async (url) => ({ url, response: await request.get(url) })));
    for (const { url, response } of responses) expect(response.ok(), `${url} returned ${response.status()}`).toBe(true);
  }
});
