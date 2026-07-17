import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";
const dataBackend = process.env.SUPABASE_E2E === "1" ? "supabase" : "local";
const authProvider = process.env.SUPABASE_E2E === "1" ? "supabase" : "local";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "output/playwright/test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["line"],
    ["html", { outputFolder: "output/playwright/report", open: "never" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `VITE_DATA_BACKEND=${dataBackend} VITE_AUTH_PROVIDER=${authProvider} npm run dev -- --host 127.0.0.1 --port 4173`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
