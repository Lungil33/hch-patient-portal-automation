// tests/appointments/clinic-finder.spec.ts
//
// SCENARIO: Patient looking for a clinic — false login attempts
//
// This file demonstrates how Playwright automation handles negative login flows.
// A patient tries to access the clinic finder / portal with invalid credentials
// and the portal should reject the attempt with a visible error message.
//
// TEST IDs:
//   P-10 — false credentials are rejected and error is displayed

import { test, expect } from '../fixtures/authFixture';
import { INVALID_CREDENTIALS } from '../data/testData';

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe('Clinic Finder — Patient Login Scenarios', () => {

  // Use a fresh, unauthenticated browser context so no saved session interferes.
  test.use({ storageState: { cookies: [], origins: [] } });

  // ── P-10 ───────────────────────────────────────────────────────────────────

  test('P-10: patient with invalid credentials cannot access clinic finder', async ({
    loginPage,
  }) => {
    // ── Step 1: Navigate to the login page ────────────────────────────────
    await loginPage.goToLoginPage();

    // Verify the login form is present before attempting to sign in
    await loginPage.assertLoginPageLoaded();

    // ── Step 2: Attempt login with false credentials ───────────────────────
    // These credentials are intentionally wrong — they should never match a
    // real account.  The portal must reject them and show an error.
    await loginPage.login(
      INVALID_CREDENTIALS.email,
      INVALID_CREDENTIALS.password,
    );

    // ── Step 3: Assert login was rejected ─────────────────────────────────
    // The portal should display an error (e.g. "Invalid credentials") and
    // must NOT redirect the patient to the dashboard / clinic finder.
    await loginPage.assertLoginFailed();

    // ── Step 4: Confirm the patient is still on the login page ────────────
    // The URL should still contain '/login' (or at least not contain a
    // post-login path like '/dashboard' or '/appointments').
    const currentUrl = loginPage.currentUrl();
    expect(
      currentUrl.includes('/login') ||
      !currentUrl.includes('/dashboard') &&
      !currentUrl.includes('/appointments'),
      `Expected to remain on login page but landed on: ${currentUrl}`,
    ).toBeTruthy();
  });

});
