import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests drive the real built app against a throwaway SQLite database.
 *   npm run build && npm run test:e2e
 *
 * The app runs in production mode, which refuses localhost as AUTH_URL (invite links would be wrong),
 * so it is served as http://test.example:3100 and Chromium is told to resolve that name to 127.0.0.1.
 */
const PORT = 3100;
const HOST = `http://test.example:${PORT}`;
export const E2E_DB = path.resolve(__dirname, "e2e/.tmp/e2e.db");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: HOST,
    trace: "retain-on-failure",
    // E2E_CHROME lets you point at an already installed Chromium instead of downloading one.
    launchOptions: { args: ["--host-resolver-rules=MAP test.example 127.0.0.1"], executablePath: process.env.E2E_CHROME || undefined },
  },
  webServer: [
    {
      // Test mail server: the app sends real SMTP here and the tests read the messages back.
      command: "npx tsx e2e/smtp-sink.ts",
      url: "http://127.0.0.1:2526/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `npx tsx e2e/prepare.ts && npx next start -p ${PORT}`,
      url: `http://127.0.0.1:${PORT}/`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: `file:${E2E_DB}`,
        AUTH_URL: HOST,
        NEXTAUTH_URL: HOST,
        AUTH_TRUST_HOST: "true",
        AUTH_SECRET: "e2e-only-secret-not-for-production-0123456789",
        CRON_SECRET: "e2e-cron-secret",
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: "2525",
        MAIL_FROM: "Site <site@e2e.test>",
        NOTIFY_EMAIL: "owner@e2e.test",
      },
    },
  ],
});
