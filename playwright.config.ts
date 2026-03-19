// playwright.config.ts
// Central Playwright configuration for the HCH patient portal test suite.
// All environment-specific values are read from the .env file at runtime.
// Copy .env.example → .env and fill in your real values before running.

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load .env values into process.env
dotenv.config();

export default defineConfig({
  // Where Playwright looks for test files
  testDir: './tests',

  // Run tests sequentially — avoids session conflicts when multiple tests
  // share the same authenticated patient account
  fullyParallel: false,

  // Prevent accidental test.only from being committed and run on CI
  forbidOnly: !!process.env.CI,

  // Retry failing tests on CI only (saves time locally)
  retries: process.env.CI ? 2 : 0,

  // One worker keeps auth state consistent across the suite
  workers: 1,

  // HTML report for local review; list format for readable CI logs
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    // Base URL driven by env var — no trailing slash
    baseURL: process.env.HCH_PORTAL_URL,

    // Reuse the patient session saved by global-setup.ts.
    // This means tests start already logged in — no login UI per test.
    storageState: '.auth/patient.json',

    // Portal pages can be slow — give actions and navigation generous budgets
    actionTimeout:     30_000,
    navigationTimeout: 60_000,

    // Capture traces, screenshots, and video on first retry to aid debugging
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'on-first-retry',
  },

  // Runs once before all tests: logs in as the test patient and saves session
  globalSetup: './global-setup',

  // Runs once after all tests: placeholder for cancelling test bookings
  globalTeardown: './global-teardown',

  projects: [
    // ── Patient portal (booking) tests — Chromium ────────────────────────────
    // Runs the existing P-01 / P-02 tests against the HCH patient portal.
    // Uses storageState from .auth/patient.json saved by global-setup.ts.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Ignore self-signed certs in non-prod HCH environments
        ignoreHTTPSErrors: true,
      },
    },

    // ── Dynamics 365 / chatbot tests — Google Chrome ─────────────────────────
    // Runs the new P-03 → P-09 tests against the HCH Dynamics 365 UAT app.
    //
    // PREREQUISITES:
    //   1. Run: npx playwright install chromium
    //   2. Set HCH_DYNAMICS_URL, HCH_DYNAMICS_EMAIL, HCH_DYNAMICS_PASSWORD
    //      in your .env file (see .env.example).
    //
    // storageState: .auth/dynamics.json is created by the Dynamics auth block
    // in global-setup.ts (runs automatically before any test in this project).
    //
    // baseURL: overrides the global baseURL — Dynamics tests navigate using the
    // full URL in HCH_DYNAMICS_URL rather than relative paths.
    {
      name: 'google-chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        ignoreHTTPSErrors: true,
        storageState: '.auth/dynamics.json',
        baseURL: process.env.HCH_DYNAMICS_URL,
      },
    },
  ],

  // Per-test timeout — booking flows involve multiple page transitions
  timeout: 90_000,
  expect: {
    // Assertion timeout — allow for slow portal responses
    timeout: 30_000,
  },
});
