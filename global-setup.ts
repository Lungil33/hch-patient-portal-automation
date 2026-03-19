// global-setup.ts
// Runs ONCE before any test in the suite starts.
//
// PURPOSE:
//   Log into the HCH patient portal using the test patient credentials from
//   .env, then save the resulting browser session (cookies + localStorage) to
//   .auth/patient.json. All tests then reuse this saved session via
//   storageState in playwright.config.ts — so no test needs its own login.
//
// WHY THIS MATTERS:
//   • Faster: login happens once, not before every single test.
//   • Cleaner tests: tests focus on their scenario, not on login mechanics.
//   • Consistent: every test starts with the same authenticated state.
//
// IF THIS FAILS:
//   A screenshot is saved to .auth/setup-failure.png to help you diagnose
//   what went wrong (wrong URL, bad credentials, unexpected login page, etc.).

import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs   from 'fs';
import * as dotenv from 'dotenv';

// Load .env variables before reading process.env
dotenv.config();

const AUTH_DIR  = path.join(__dirname, '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'patient.json');

async function globalSetup(_config: FullConfig): Promise<void> {
  const email    = process.env.HCH_PATIENT_EMAIL;
  const password = process.env.HCH_PATIENT_PASSWORD;
  const baseUrl  = process.env.HCH_PORTAL_URL;

  // Validate that all required env vars are present before doing anything
  if (!email || !password || !baseUrl) {
    throw new Error(
      '[global-setup] Missing required environment variables.\n' +
      'Make sure HCH_PATIENT_EMAIL, HCH_PATIENT_PASSWORD, and HCH_PORTAL_URL\n' +
      'are set in your .env file (copy .env.example → .env to get started).'
    );
  }

  // Create the .auth directory if it doesn't already exist
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Launch a temporary browser just for the login flow
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  try {
    // ── Step 1: Navigate to the portal ──────────────────────────────────────
    console.log(`[global-setup] Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    // ── Step 2: Fill in the email field ─────────────────────────────────────
    // Multiple selector fallbacks handle slight variations in portal HTML.
    // UPDATE: Replace with the selector you find when inspecting the real portal.
    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[name="username"]'
    );
    await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
    await emailInput.fill(email);

    // ── Step 3: Fill in the password field ──────────────────────────────────
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await passwordInput.fill(password);

    // ── Step 4: Click the login/submit button ────────────────────────────────
    // UPDATE: Replace with the exact button label used in the HCH portal.
    await page
      .getByRole('button', { name: /log in|sign in|login|submit/i })
      .click();

    // ── Step 5: Wait for the portal to finish redirecting after login ────────
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // ── Step 6: Verify login succeeded ──────────────────────────────────────
    // Check that the URL changed away from /login (or wherever login starts).
    // UPDATE: Replace '/login' with the exact login path in the HCH portal.
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error(
        '[global-setup] Login appears to have failed — still on the login page.\n' +
        `Current URL: ${currentUrl}\n` +
        'Check that HCH_PATIENT_EMAIL and HCH_PATIENT_PASSWORD are correct.'
      );
    }

    // ── Step 7: Save the authenticated session ───────────────────────────────
    await context.storageState({ path: AUTH_FILE });
    console.log(`[global-setup] Authenticated session saved to ${AUTH_FILE}`);

  } catch (error) {
    // Take a screenshot so you can see exactly what the page looked like
    // when the login failed — saved to .auth/setup-failure.png
    const screenshotPath = path.join(AUTH_DIR, 'setup-failure.png');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    console.error(
      `[global-setup] Login failed. Screenshot saved to ${screenshotPath}`
    );
    throw error;
  } finally {
    // Always close the browser, even if an error occurred
    await browser.close();
  }
}

export default globalSetup;
