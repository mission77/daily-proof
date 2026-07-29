import { defineConfig, devices } from "@playwright/test";

// No CSP or security-header changes here or anywhere else for testing — see
// e2e/helpers.ts for why: time-based Timer scenarios are driven by seeding
// IndexedDB timestamps directly instead of mocking the browser clock, so
// nothing about the production CSP (next.config.mjs) needs to change for
// tests to work.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    // The production build, not `next dev`: Next's dev-mode bundler wraps
    // modules in eval() for fast refresh, which the strict CSP's script-src
    // (no 'unsafe-eval', see next.config.mjs) correctly blocks — exactly the
    // trade-off this task forbids working around by loosening the CSP. The
    // production bundle has no eval() in it, so it runs clean under the real
    // shipped headers, which is also the more meaningful target for a
    // launch-candidate test pass.
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
