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

import { chromium, webkit, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs   from 'fs';
import * as dotenv from 'dotenv';

// Load .env variables before reading process.env
dotenv.config();

const AUTH_DIR           = path.join(__dirname, '.auth');
const PORTAL_AUTH_FILE   = path.join(AUTH_DIR, 'patient.json');
const DYNAMICS_AUTH_FILE = path.join(AUTH_DIR, 'dynamics.json');

// ════════════════════════════════════════════════════════════════════════════
// BLOCK 1 — HCH Patient Portal login (Chromium, saves patient.json)
// ════════════════════════════════════════════════════════════════════════════
async function setupPortalAuth(): Promise<void> {
  const email    = process.env.HCH_PATIENT_EMAIL;
  const password = process.env.HCH_PATIENT_PASSWORD;
  const baseUrl  = process.env.HCH_PORTAL_URL;

  // Validate that all required env vars are present before doing anything
  if (!email || !password || !baseUrl) {
    throw new Error(
      '[global-setup:portal] Missing required environment variables.\n' +
      'Make sure HCH_PATIENT_EMAIL, HCH_PATIENT_PASSWORD, and HCH_PORTAL_URL\n' +
      'are set in your .env file (copy .env.example → .env to get started).'
    );
  }

  // Launch a temporary browser just for the login flow
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  try {
    // ── Step 1: Navigate to the portal ────────────────────────────────────
    console.log(`[global-setup:portal] Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    // ── Step 2: Fill in the email field ───────────────────────────────────
    // Multiple selector fallbacks handle slight variations in portal HTML.
    // UPDATE: Replace with the selector you find when inspecting the real portal.
    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[name="username"]'
    );
    await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
    await emailInput.fill(email);

    // ── Step 3: Fill in the password field ────────────────────────────────
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await passwordInput.fill(password);

    // ── Step 4: Click the login/submit button ─────────────────────────────
    // UPDATE: Replace with the exact button label used in the HCH portal.
    // Try the simple form login button first; if not found (e.g. portal uses
    // Microsoft OAuth), fall through to the Microsoft login handler below.
    const simpleLoginBtn = page.getByRole('button', { name: /log in|sign in|login|submit/i });
    const hasSimpleLogin = await simpleLoginBtn.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasSimpleLogin) {
      await simpleLoginBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 });
    } else {
      // Portal may use Microsoft OAuth — handle the Microsoft login flow
      console.log('[global-setup:portal] Simple login form not found; trying Microsoft OAuth flow…');

      const msEmailInput = page.locator('input[name="loginfmt"]');
      const hasMsLogin = await msEmailInput.isVisible({ timeout: 8_000 }).catch(() => false);

      if (hasMsLogin) {
        await msEmailInput.fill(email);
        await page.getByRole('button', { name: /next/i }).click();

        const msPasswordInput = page.locator('input[name="passwd"], input[type="password"]');
        await msPasswordInput.waitFor({ state: 'visible', timeout: 15_000 });
        await msPasswordInput.fill(password);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Handle "Stay signed in?" prompt
        await page.locator('#idSIButton9, button[value="yes"]')
          .first()
          .click({ timeout: 8_000 })
          .catch(() => {});

        await page.waitForLoadState('networkidle', { timeout: 60_000 });
      } else {
        console.warn('[global-setup:portal] No login form recognised — saving current session as-is.');
      }
    }

    // ── Step 5 (formerly 6): Verify login succeeded ────────────────────────
    const currentUrl = page.url();
    if (currentUrl.includes('/login') && !currentUrl.includes('microsoftonline')) {
      throw new Error(
        '[global-setup:portal] Login appears to have failed — still on the login page.\n' +
        `Current URL: ${currentUrl}\n` +
        'Check that HCH_PATIENT_EMAIL and HCH_PATIENT_PASSWORD are correct.'
      );
    }

    // ── Step 6 (formerly 7): Save the authenticated session ───────────────
    await context.storageState({ path: PORTAL_AUTH_FILE });
    console.log(`[global-setup:portal] Session saved to ${PORTAL_AUTH_FILE}`);

  } catch (error) {
    const screenshotPath = path.join(AUTH_DIR, 'setup-failure.png');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    console.error(`[global-setup:portal] Login failed. Screenshot: ${screenshotPath}`);
    throw error;
  } finally {
    await browser.close();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK 2 — Dynamics 365 / Power Apps login (Chromium, saves dynamics.json)
//
// WHY CHROMIUM HERE EVEN THOUGH TESTS RUN ON EDGE:
//   global-setup runs in Chromium by default (it's a Node script, not a
//   project test).  The saved storageState (cookies/localStorage) is
//   browser-agnostic — Playwright can replay it in any channel including Edge.
//   If the Dynamics tenant uses device fingerprinting that distinguishes
//   browsers, switch `chromium.launch()` to `chromium.launch({ channel: 'msedge' })`.
//
// AUTH FLOW — Microsoft OAuth / MSAL (login.microsoftonline.com):
//   1. Navigate to the Dynamics 365 URL → redirects to Microsoft login
//   2. Enter email → click Next
//   3. Enter password → click Sign in
//   4. Handle optional "Stay signed in?" prompt → click Yes
//   5. Wait for Dynamics 365 app to fully load
//   6. Save session to .auth/dynamics.json
//
// GUARD:
//   This block is skipped entirely if HCH_DYNAMICS_URL is not set,
//   allowing portal-only test runs without Dynamics credentials.
// ════════════════════════════════════════════════════════════════════════════
async function setupDynamicsAuth(): Promise<void> {
  const dynamicsUrl = process.env.HCH_DYNAMICS_URL;
  const email       = process.env.HCH_DYNAMICS_EMAIL;
  const password    = process.env.HCH_DYNAMICS_PASSWORD;

  // Guard — skip gracefully if Dynamics vars are not configured
  if (!dynamicsUrl) {
    console.log(
      '[global-setup:dynamics] HCH_DYNAMICS_URL not set — skipping Dynamics auth.\n' +
      '  (This is expected when running portal-only tests.  Set HCH_DYNAMICS_URL,\n' +
      '   HCH_DYNAMICS_EMAIL, and HCH_DYNAMICS_PASSWORD in .env to enable chatbot tests.)'
    );
    // Write an empty storageState so the 'microsoft-edge' project doesn't crash
    // when it tries to load .auth/dynamics.json on first run.
    if (!fs.existsSync(DYNAMICS_AUTH_FILE)) {
      fs.writeFileSync(DYNAMICS_AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    }
    return;
  }

  if (!email || !password) {
    throw new Error(
      '[global-setup:dynamics] HCH_DYNAMICS_URL is set but HCH_DYNAMICS_EMAIL\n' +
      'and/or HCH_DYNAMICS_PASSWORD are missing from .env.\n' +
      'Add them or remove HCH_DYNAMICS_URL to skip the Dynamics auth step.'
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page    = await context.newPage();

  try {
    // ── Step 1: Navigate to the Dynamics 365 app URL ──────────────────────
    // Microsoft will redirect to login.microsoftonline.com automatically.
    console.log('[global-setup:dynamics] Navigating to Dynamics 365 app…');
    await page.goto(dynamicsUrl, { waitUntil: 'networkidle', timeout: 60_000 });

    // ── Step 2: Microsoft login — enter email ─────────────────────────────
    // UPDATE: If your tenant uses ADFS or a custom login page, the selectors
    // below may differ.  Inspect login.microsoftonline.com in dev-tools.
    const emailInput = page.locator('input[type="email"], input[name="loginfmt"]');
    await emailInput.waitFor({ state: 'visible', timeout: 30_000 });
    await emailInput.fill(email);

    // Click "Next" to proceed to the password screen
    await page
      .getByRole('button', { name: /next/i })
      .or(page.locator('input[type="submit"][value*="Next" i]'))
      .click();

    // ── Step 3: Microsoft login — enter password ───────────────────────────
    const passwordInput = page.locator('input[type="password"], input[name="passwd"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await passwordInput.fill(password);

    // Click "Sign in"
    await page
      .getByRole('button', { name: /sign in/i })
      .or(page.locator('input[type="submit"][value*="Sign in" i]'))
      .click();

    // ── Step 4: Handle "Stay signed in?" prompt (optional) ────────────────
    // This prompt may or may not appear depending on tenant settings.
    // We wait briefly and click "Yes" if it appears; otherwise we continue.
    try {
      await page.waitForSelector(
        'button[value="yes"], input[value="Yes"], #idSIButton9',
        { state: 'visible', timeout: 8_000 }
      );
      await page
        .locator('button[value="yes"], input[value="Yes"], #idSIButton9')
        .first()
        .click();
    } catch {
      // Prompt did not appear — continue
    }

    // ── Step 5: Handle any additional MFA / consent prompts ───────────────
    // UPDATE: If your tenant enforces MFA (Authenticator app, SMS code, etc.)
    // you will need to handle it here.  Options:
    //   (a) Configure a test account with MFA disabled (recommended for CI).
    //   (b) Use Playwright's OTP helper if SMS/TOTP is used.
    //   (c) Pre-provision a conditional access policy that exempts the test account.
    // For now we wait for the Dynamics app to load (see Step 6).

    // ── Step 6: Wait for Dynamics 365 to fully load ───────────────────────
    // The app renders inside a shell — wait for networkidle plus a known
    // Dynamics DOM element.
    await page.waitForLoadState('networkidle', { timeout: 60_000 });

    // Wait for the Dynamics main content area or any top-level navigation
    // UPDATE: Replace with a more specific selector once you see the real DOM.
    await page
      .locator('[data-id="mainContent"], #mainContent, [role="main"], .pa-cc-ap')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 })
      .catch(() => {
        console.warn(
          '[global-setup:dynamics] mainContent selector not matched; ' +
          'saving session anyway.  UPDATE the selector in global-setup.ts.'
        );
      });

    // ── Step 7: Verify we are not still on the login page ─────────────────
    const currentUrl = page.url();
    if (currentUrl.includes('login.microsoftonline.com')) {
      throw new Error(
        '[global-setup:dynamics] Still on Microsoft login page after auth.\n' +
        `Current URL: ${currentUrl}\n` +
        'Possible causes: wrong password, MFA blocking, or conditional access policy.\n' +
        'Check HCH_DYNAMICS_EMAIL and HCH_DYNAMICS_PASSWORD in .env.'
      );
    }

    // ── Step 8: Save the Dynamics session ─────────────────────────────────
    await context.storageState({ path: DYNAMICS_AUTH_FILE });
    console.log(`[global-setup:dynamics] Session saved to ${DYNAMICS_AUTH_FILE}`);

  } catch (error) {
    const screenshotPath = path.join(AUTH_DIR, 'dynamics-setup-failure.png');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    console.error(
      `[global-setup:dynamics] Auth failed. Screenshot: ${screenshotPath}\n` +
      'Open the screenshot to see exactly what went wrong.'
    );
    throw error;
  } finally {
    await browser.close();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// Playwright calls this function once before any test in the suite.
// ════════════════════════════════════════════════════════════════════════════
async function globalSetup(_config: FullConfig): Promise<void> {
  // Ensure .auth directory exists before either block tries to write to it
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Run both auth setups.  Portal auth is always required; Dynamics auth is
  // skipped gracefully when HCH_DYNAMICS_URL is not set.
  await setupPortalAuth();
  await setupDynamicsAuth();
}

export default globalSetup;
