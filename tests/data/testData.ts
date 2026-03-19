// tests/data/testData.ts
// Stable test constants for the HCH patient portal test suite.
//
// WHY THIS FILE EXISTS:
//   Keeping test data in one place means you only need to update values here
//   when the portal changes — rather than hunting through every test file.
//
// RULE: Environment-specific values (URLs, credentials, names) come from
//   process.env (loaded from your .env file) — never hardcode them here.
//   Only put values here that are truly constant across all environments.

// ── Patient credentials ────────────────────────────────────────────────────────
// Read from .env — never hardcoded in test files or committed to source control.
export const TEST_PATIENT = {
  email:    process.env.HCH_PATIENT_EMAIL    ?? 'testpatient@example.com',
  password: process.env.HCH_PATIENT_PASSWORD ?? 'changeme',
} as const;

// ── Appointment booking data ───────────────────────────────────────────────────
// These values drive the booking test (P-02).
// Set them in .env to match real options available in your HCH test environment.
export const APPOINTMENT = {
  // Must match the exact service name shown in the portal dropdown
  serviceType:   process.env.HCH_SERVICE_TYPE   ?? 'General Practice',

  // Must match the exact clinician name shown in the portal provider list
  providerName:  process.env.HCH_PROVIDER_NAME  ?? 'Dr. Test Provider',

  // Date in YYYY-MM-DD format — must be a future date with available slots
  preferredDate: process.env.HCH_PREFERRED_DATE ?? '2026-04-01',
} as const;

// ── Timeouts (milliseconds) ────────────────────────────────────────────────────
// Centralised here so they can be adjusted for slow environments without
// changing individual test files.
export const TIMEOUTS = {
  navigation: 30_000,   // Page-level navigation
  formLoad:   20_000,   // Form elements becoming visible
  booking:    30_000,   // Booking confirmation appearing after submit
} as const;

// ── Portal paths ───────────────────────────────────────────────────────────────
// Relative paths used in navigateTo() calls.
// UPDATE these if the HCH portal uses different URL patterns.
export const PORTAL_PATHS = {
  login:    '/login',
  home:     '/',
  booking:  '/appointments/book',   // UPDATE to the real booking path
} as const;
