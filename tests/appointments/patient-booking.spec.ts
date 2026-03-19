// tests/appointments/patient-booking.spec.ts
//
// ════════════════════════════════════════════════════════════════════════════════
//  HCH AUTOMATION — Patient Appointment Booking
//  Reference test case | Author: Lungie | Created: 19 March 2026
// ════════════════════════════════════════════════════════════════════════════════
//
// WHAT THIS FILE TESTS:
//   The end-to-end journey of a patient booking an appointment on the HCH
//   patient portal, covering:
//     1. Patient logs in
//     2. Patient selects a service / appointment type
//     3. Patient selects a provider / clinician
//     4. Patient selects a date and an available time slot
//     5. Patient confirms the booking and sees a confirmation
//
// HOW IMPORTS WORK:
//   We import from our custom fixture file — NOT from '@playwright/test' directly.
//   This gives us the `bookingPage` and `loginPage` fixtures (pre-built page
//   objects) AND ensures the page starts with the patient already authenticated.
//
// HOW TO RUN THIS FILE:
//   Prerequisites:
//     1. npm install               (install dependencies)
//     2. npx playwright install chromium  (install the browser)
//     3. cp .env.example .env      (create your env file)
//     4. Edit .env — fill in the real portal URL, test patient credentials,
//        service name, provider name, and a future date with available slots.
//
//   Commands:
//     npm test                          Run all tests (headless)
//     npm run test:headed               Run with visible browser window
//     npm run test:ui                   Open Playwright's interactive UI
//     npm test -- --grep "P-01"        Run only the smoke test
//     npm test -- --grep "P-02"        Run only the E2E booking test
//     npm run report                    Open the HTML results report

import { test, expect } from '../fixtures/authFixture';
import { APPOINTMENT, PORTAL_PATHS, TIMEOUTS } from '../data/testData';

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TESTS
// Purpose: Verify the portal is reachable and the login page loads correctly.
// These tests do NOT require the patient to be logged in — they run before
// the storageState is needed and are intentionally lightweight.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('HCH Patient Portal – Appointment Booking (Smoke)', () => {

  test('P-01: portal is reachable and login page loads', async ({ loginPage }) => {
    // Navigate to the login page (path defined in testData.ts → PORTAL_PATHS.login)
    // UPDATE: If the HCH portal redirects / to the login page automatically,
    // you may not need to navigate explicitly — remove the line below and
    // use navigateTo('/') instead.
    await loginPage.goToLoginPage();

    // Assert that the email input and login button are visible.
    // If this fails, check that HCH_PORTAL_URL in your .env is correct
    // and that the portal is running and accessible from your machine.
    await loginPage.assertLoginPageLoaded();

    // Verify the page title is not empty — a basic sanity check
    const title = await loginPage.getPageTitle();
    expect(title).not.toBe('');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL TESTS
// Purpose: Test real user journeys with full interaction.
// These tests rely on the authenticated session saved by global-setup.ts,
// so the patient is already logged in when each test starts.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('HCH Patient Portal – Appointment Booking (Functional)', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // P-02: End-to-end appointment booking
  //
  // This is the MAIN reference test case. It walks through all four steps of
  // the booking flow in a single test because the steps are sequential and
  // depend on each other — you cannot select a time slot without first
  // selecting a date, and so on.
  //
  // BEFORE RUNNING:
  //   Make sure the following values in your .env are valid for your HCH test
  //   environment — they must match options that actually exist in the portal:
  //     HCH_SERVICE_TYPE     (e.g. "General Practice")
  //     HCH_PROVIDER_NAME    (e.g. "Dr. Jane Smith")
  //     HCH_PREFERRED_DATE   (e.g. "2026-04-01" — must be a future date with slots)
  // ──────────────────────────────────────────────────────────────────────────

  test('P-02: patient can book an appointment end-to-end', async ({ bookingPage }) => {

    // ── Step 1: Navigate to the booking form ──────────────────────────────
    // The patient is already logged in (storageState from global-setup.ts).
    // We navigate to the portal home, then click "Book an appointment".
    //
    // WHY: We start from the home page to simulate a real patient journey
    //      rather than jumping directly to a deep URL — this also validates
    //      that the navigation link is working.
    await bookingPage.navigateTo(PORTAL_PATHS.home);
    await bookingPage.startBookingFlow();

    // Assert the booking form has loaded before we start filling it in.
    // If this fails, UPDATE the bookingAppointmentLink selector in
    // AppointmentBookingPage.ts to match the portal's "Book" button/link.
    await bookingPage.assertBookingFormLoaded();

    // ── Step 2: Select service / appointment type ─────────────────────────
    // Chooses the service from the first dropdown on the booking form.
    // The value comes from HCH_SERVICE_TYPE in your .env file.
    //
    // IF THIS FAILS: The service name in .env does not match any option in
    // the portal dropdown. Open the portal, inspect the dropdown options,
    // and update HCH_SERVICE_TYPE in .env to match exactly.
    await bookingPage.selectService(APPOINTMENT.serviceType);

    // ── Step 3: Select provider / clinician ──────────────────────────────
    // After selecting a service, the portal filters available providers.
    // This step picks the provider matching HCH_PROVIDER_NAME in .env.
    //
    // IF THIS FAILS: The provider name in .env does not match. Update
    // HCH_PROVIDER_NAME to the exact name shown in the portal after you
    // select the service type above.
    await bookingPage.selectProvider(APPOINTMENT.providerName);

    // ── Step 4: Select preferred date ────────────────────────────────────
    // Fills the date picker with the date from HCH_PREFERRED_DATE in .env.
    // Date format: YYYY-MM-DD (e.g. "2026-04-01").
    //
    // IF THIS FAILS: Try a different future date in .env. The portal may
    // show no available slots if the provider is fully booked on that day.
    await bookingPage.selectDate(APPOINTMENT.preferredDate);

    // ── Step 5: Select first available time slot ──────────────────────────
    // Clicks the first slot that appears after the date is entered.
    // We pick the first available slot rather than a specific time because
    // slot availability changes — a fixed time would make the test flaky.
    //
    // IF THIS FAILS: No slots are available on the chosen date. Pick a
    // different HCH_PREFERRED_DATE in .env, or UPDATE the firstAvailableSlot
    // selector in AppointmentBookingPage.ts to match the portal's slot HTML.
    await bookingPage.selectFirstAvailableSlot();

    // ── Step 6: Confirm the booking ───────────────────────────────────────
    // Clicks the "Confirm booking" / "Book now" button to submit.
    // The portal should redirect to a confirmation page after this.
    await bookingPage.confirmBooking();

    // ── Assertion: Booking confirmation is visible ─────────────────────────
    // This is the most important assertion — it proves the booking went through.
    // If this fails, the booking may have been submitted but the confirmation
    // selector doesn't match. UPDATE bookingConfirmationHeading in
    // AppointmentBookingPage.ts to match the portal's success message.
    await bookingPage.assertBookingConfirmed();

    // Optional: also verify the page title changed to confirm navigation
    const title = await bookingPage.getPageTitle();
    expect(title).not.toBe('');
  });

});
