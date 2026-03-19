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

// ── Chatbot messages ───────────────────────────────────────────────────────────
// Text sent to the bot during appointment-check tests (P-04 → P-09).
// Phrasing intentionally mirrors natural patient language to properly exercise
// intent recognition in the HCH Copilot Studio / Power Virtual Agents bot.
//
// UPDATE: Adjust wording to match the trigger phrases registered in your bot's
// topics if tests are failing at the intent-recognition step.
export const CHATBOT_MESSAGES = {
  // Opening question — triggers the appointment-check intent (P-04)
  appointmentQuery:     'I want to check my appointment',

  // Response when the bot asks for the patient's ID (P-05)
  // Set HCH_PATIENT_ID in .env — defaults to the demo value below
  patientIdResponse:    process.env.HCH_PATIENT_ID ?? '12345',

  // Follow-up to trigger the cancellation/rescheduling topic (P-07)
  cancellationQuery:    'How do I cancel or reschedule my appointment?',

  // Message to trigger escalation to a human agent (P-08)
  escalationQuery:      'I need to speak to someone about my appointment',
} as const;

// ── Appointment check test data ───────────────────────────────────────────────
// Data for the Post Procedure appointment used in P-06 and P-09.
// These values describe the appointment already in the UAT system.
export const APPOINTMENT_CHECK = {
  type:         'Post Procedure',
  provider:     process.env.HCH_PROVIDER_NAME ?? 'Dr. Test Provider',
  date:         '02-03-2026',    // DD-MM-YYYY — the appointment date in UAT
  startTime:    '12:00',
  durationMins: 30,
} as const;

// ── Dynamics 365 / Power Apps paths ───────────────────────────────────────────
// AppointmentCheckPage.navigateToDynamicsApp() uses the full absolute URL from
// HCH_DYNAMICS_URL — it does not build a path relative to a base.
// This constant exists as a reference / documentation aid.
export const DYNAMICS_PATHS = {
  // The full app URL is stored in HCH_DYNAMICS_URL (set in .env).
  // Pass an empty string — navigateToDynamicsApp() handles the goto() directly.
  app: '',
} as const;
