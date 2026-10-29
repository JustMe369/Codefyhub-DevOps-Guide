import { defineConfig, devices } from "@playwright/test";

const port = process.env.CI ? 3100 : 3000;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } }
  ],
  webServer: {
    command: process.env.CI ? "npm start -- --port 3100" : "npm run dev",
    url: `${baseURL}/api/health`,
    env: { BETTER_AUTH_URL: baseURL },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
