import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("search, lesson navigation, and readiness export are available", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Build infrastructure/i })).toBeVisible();
  const globalSearch = page.getByLabel("Search the guide");
  await globalSearch.fill("cloud-init");
  await globalSearch.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=cloud-init$/);
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

test("article metadata, security headers, keyboard access, and resilient storage work", async ({ page, browserName }) => {
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
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  if (browserName === "webkit") await skipLink.focus();
  else await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
});

test("every URL published in the sitemap responds successfully", async ({ request, browserName }) => {
  test.skip(browserName !== "chromium", "The HTTP route matrix is browser-independent and runs once.");
  test.setTimeout(180_000);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const routes = urls.map((url) => {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  });
  expect(urls.length).toBeGreaterThanOrEqual(70);
  for (let index = 0; index < routes.length; index += 8) {
    const batch = routes.slice(index, index + 8);
    const responses = await Promise.all(batch.map(async (route) => ({ route, response: await request.get(route) })));
    for (const { route, response } of responses) expect(response.ok(), `${route} returned ${response.status()}`).toBe(true);
  }
});

test("core pages have no serious accessibility violations", async ({ page, browserName }) => {
  test.setTimeout(120_000);
  test.skip(browserName !== "chromium", "The axe ruleset runs once; user journeys still run in every browser.");
  for (const path of ["/", "/guides/start-here/reference-architecture", "/exam", "/checklist"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")), `${path} accessibility violations`).toEqual([]);
  }
});

test("storage vertical slice exposes reviewed metadata, runbook, artifact, and keyboard search", async ({ page }) => {
  await page.goto("/guides/storage-raid/mdadm-zfs");
  await expect(page.getByText("Source-reviewed", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prerequisites", exact: true })).toBeVisible();
  await expect(page.locator(".related-guides").getByRole("link", { name: /Recover a degraded mdadm RAID 1 array/i })).toBeVisible();
  await page.getByRole("link", { name: "Review artifact" }).click();
  await expect(page.getByRole("link", { name: /Download mdadm-monitoring.conf/i })).toHaveAttribute("download", "");
  await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
  const search = page.getByLabel("Search the guide");
  await expect(search).toBeFocused();
  await search.fill("mdadm cannot open");
  await expect(page.getByRole("option", { name: /Recover a degraded mdadm RAID 1 array/i })).toBeVisible();
});
