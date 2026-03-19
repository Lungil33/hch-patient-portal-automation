// tests/fixtures/authFixture.ts
// Extends Playwright's built-in test object with HCH-specific fixtures.
//
// WHY THIS FILE EXISTS:
//   All test files must import { test, expect } from THIS file — not from
//   '@playwright/test' directly. This gives every test access to:
//     • page       — the standard Playwright page, pre-authenticated via
//                    the storageState saved by global-setup.ts
//     • bookingPage — a ready-to-use AppointmentBookingPage instance
//     • loginPage   — a ready-to-use PatientPortalLoginPage instance
//
// HOW AUTH WORKS (so you understand what "pre-authenticated" means):
//   1. Before ANY test runs, global-setup.ts opens a real browser, navigates
//      to the patient portal, fills in the login form, and saves the resulting
//      cookies/localStorage to .auth/patient.json.
//   2. playwright.config.ts sets storageState: '.auth/patient.json', so every
//      browser context created for a test already has that session loaded.
//   3. This means tests start on whatever page you navigate to — already
//      logged in — without needing to repeat the login steps each time.

import { test as base, expect } from '@playwright/test';
import { AppointmentBookingPage } from '../../pages/AppointmentBookingPage';
import { PatientPortalLoginPage } from '../../pages/PatientPortalLoginPage';

// Declare the shape of our custom fixtures so TypeScript knows about them
type HchFixtures = {
  bookingPage: AppointmentBookingPage;
  loginPage:   PatientPortalLoginPage;
};

export const test = base.extend<HchFixtures>({
  // bookingPage fixture — inject a fully constructed AppointmentBookingPage
  bookingPage: async ({ page }, use) => {
    // storageState is applied via playwright.config.ts — the page is already
    // authenticated at this point, no manual login required
    const bookingPage = new AppointmentBookingPage(page);
    await use(bookingPage);
    // No teardown needed here — the browser context is destroyed after each test
  },

  // loginPage fixture — used in smoke tests that interact with the login form
  loginPage: async ({ page }, use) => {
    const loginPage = new PatientPortalLoginPage(page);
    await use(loginPage);
  },
});

// Re-export expect so test files only need a single import line
export { expect };
