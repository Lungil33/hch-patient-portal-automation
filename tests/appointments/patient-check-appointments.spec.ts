// tests/appointments/patient-check-appointments.spec.ts
//
// ════════════════════════════════════════════════════════════════════════════════
//  HCH AUTOMATION — Patient Appointment Check via Chatbot
//  Author: Lungie | Created: 19 March 2026
//  Test IDs: P-03 → P-09
// ════════════════════════════════════════════════════════════════════════════════
//
// WHAT THIS FILE TESTS:
//   A patient using the HCH chatbot (embedded in Dynamics 365 / Power Apps UAT)
//   to check, enquire about, and manage their existing appointments.
//
//   Acceptance Criteria covered:
//     P-03  Smoke      — Dynamics 365 app loads and chatbot widget is visible
//     P-04  Functional — Bot correctly recognises appointment-related intent
//     P-05  Functional — Bot requests patient ID (minimal info) before proceeding
//     P-06  Functional — Bot provides appointment details OR clinic instructions
//     P-07  Functional — Bot explains cancellation / rescheduling rules
//     P-08  Functional — Bot offers escalation when automated change is unavailable
//     P-09  Functional — End-to-end multi-turn appointment check conversation
//
// TEST DATA (from .env / testData.ts):
//   Appointment type : Post Procedure
//   Provider         : Confirmed available
//   Date             : 02-03-2026
//   Start time       : 12:00
//   Duration         : 30 minutes
//   Login            : Lungile@riivo.io (HCH_DYNAMICS_EMAIL)
//
// HOW IMPORTS WORK:
//   We import from our custom fixture file — NOT from '@playwright/test' directly.
//   This gives us `appointmentCheckPage` already instantiated and authenticated.
//
// HOW TO RUN:
//   Prerequisites:
//     1. npm install
//     2. npx playwright install msedge        (install Edge browser driver)
//     3. cp .env.example .env                  (if not done already)
//     4. Edit .env — fill in HCH_DYNAMICS_URL, HCH_DYNAMICS_EMAIL,
//                    HCH_DYNAMICS_PASSWORD, and HCH_PATIENT_ID.
//
//   Commands:
//     npm test -- --project=microsoft-edge              Run all chatbot tests on Edge
//     npm test -- --grep "P-03"                         Run smoke test only
//     npm test -- --grep "P-0[3-9]"                     Run all chatbot tests
//     npm test -- --grep "P-09"                         Run E2E test only
//     npm run report                                    Open HTML results report
//
// BROWSER:
//   All tests in this file run on Microsoft Edge (channel: 'msedge') via the
//   'microsoft-edge' project defined in playwright.config.ts.

import { test, expect } from '../fixtures/authFixture';
import {
  CHATBOT_MESSAGES,
  APPOINTMENT_CHECK,
  TIMEOUTS,
} from '../data/testData';

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TESTS
// Purpose: Verify the Dynamics 365 app is reachable and the chatbot widget
// loads correctly.  These tests are lightweight and run first.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('HCH Chatbot — Appointment Check (Smoke)', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // P-03: Dynamics 365 app loads and chatbot is accessible
  //
  // WHAT: Navigates to the Power Apps UAT environment and verifies that:
  //   (a) The app loads and returns a non-empty page title
  //   (b) The chatbot widget (trigger button or open input) is present
  //
  // IF THIS FAILS:
  //   • Verify HCH_DYNAMICS_URL in .env is correct and the UAT environment
  //     is running.
  //   • Check that .auth/dynamics.json was created by global-setup.ts
  //     (look for the "[global-setup:dynamics] Session saved" log line).
  //   • If the app loaded but the chatbot was not found, UPDATE the
  //     chatbotButton() and chatInput() selectors in AppointmentCheckPage.ts.
  // ──────────────────────────────────────────────────────────────────────────

  test('P-03: Dynamics 365 app loads and chatbot widget is visible @smoke', async ({
    appointmentCheckPage,
  }) => {
    // Navigate to the Dynamics 365 / Power Apps UAT environment.
    // This uses the full absolute URL from HCH_DYNAMICS_URL.
    await appointmentCheckPage.navigateToDynamicsApp();

    // Verify the page has a title (basic reachability check)
    await appointmentCheckPage.assertDynamicsAppLoaded();

    // Verify the chatbot widget is present on the page
    // (either the trigger button or an already-open chat input must be visible)
    await appointmentCheckPage.assertChatbotWidgetVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL TESTS
// Purpose: Test each acceptance criterion individually (P-04 → P-08), then
// combine them into a full end-to-end multi-turn conversation (P-09).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('HCH Chatbot — Appointment Check (Functional)', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // P-04: Bot recognises appointment-related intent
  //
  // WHAT: Sends a natural-language appointment query to the bot and verifies
  //   the bot returns a meaningful response rather than a generic
  //   "I didn't understand" error.
  //
  // ACCEPTANCE CRITERIA:
  //   "When patient asks an appointment-related question, intent is correctly
  //    recognised."
  //
  // IF THIS FAILS:
  //   • Open Copilot Studio / Power Virtual Agents and check that the
  //     "Check appointment" (or equivalent) topic is published and active.
  //   • Try adjusting CHATBOT_MESSAGES.appointmentQuery in testData.ts to
  //     match the trigger phrase registered in the bot topic.
  //   • Check assertIntentRecognized() in AppointmentCheckPage.ts — update
  //     the unrecognisedPhrases list to match the bot's exact error wording.
  // ──────────────────────────────────────────────────────────────────────────

  test('P-04: bot recognises appointment-related intent @smoke', async ({
    appointmentCheckPage,
  }) => {
    // Navigate and open the chatbot
    await appointmentCheckPage.navigateToDynamicsApp();
    await appointmentCheckPage.openChatbot();

    // Send the appointment query
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.appointmentQuery);

    // Assert the bot recognised the intent (replied meaningfully)
    await appointmentCheckPage.assertIntentRecognized();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // P-05: Bot requests patient ID
  //
  // WHAT: After sending an appointment query, verifies the bot asks for the
  //   patient's ID (or other minimal identifying information) before
  //   returning appointment details.
  //
  // ACCEPTANCE CRITERIA:
  //   "Bot requests ID (or other minimal info) if required."
  //
  // IF THIS FAILS:
  //   • Update assertBotAsksForPatientId() keyword list in
  //     AppointmentCheckPage.ts to match the exact wording the bot uses.
  //   • If the bot skips the ID step (e.g. because the session is already
  //     linked to a patient), this test may need to be adapted or removed.
  // ──────────────────────────────────────────────────────────────────────────

  test('P-05: bot requests patient ID before sharing appointment details', async ({
    appointmentCheckPage,
  }) => {
    await appointmentCheckPage.navigateToDynamicsApp();
    await appointmentCheckPage.openChatbot();

    // Trigger appointment intent
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.appointmentQuery);

    // The bot must ask for patient identification
    await appointmentCheckPage.assertBotAsksForPatientId();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // P-06: Bot provides appointment details or clinic instructions
  //
  // WHAT: After the bot asks for the patient ID, supplies the ID and then
  //   verifies the bot either:
  //     (a) Shows structured appointment data (date, time, provider), OR
  //     (b) Provides clear instructions for checking with the clinic
  //         (phone number, portal link, email, etc.)
  //
  // ACCEPTANCE CRITERIA:
  //   "Bot provides appointment date/time (if integrated).
  //    If no integration exists, bot provides clear instructions for how to
  //    check with the clinic."
  //
  // TEST DATA: Post Procedure appointment, 02-03-2026 at 12:00 (30 min)
  //
  // IF THIS FAILS:
  //   • Check assertAppointmentDetailsShown() date/time regex in
  //     AppointmentCheckPage.ts — adjust to match the bot's date format.
  //   • If no integration is live, verify the fallback wording matches
  //     the hasFallbackKw list in assertAppointmentDetailsShown().
  // ──────────────────────────────────────────────────────────────────────────

  test('P-06: bot provides appointment details or clinic fallback instructions', async ({
    appointmentCheckPage,
  }) => {
    await appointmentCheckPage.navigateToDynamicsApp();
    await appointmentCheckPage.openChatbot();

    // Step 1: Ask about the appointment
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.appointmentQuery);
    await appointmentCheckPage.assertBotAsksForPatientId();

    // Step 2: Provide the patient ID
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.patientIdResponse);

    // Step 3: Assert details are shown (integration) or fallback instructions given
    // Uses a longer timeout because integration-backed responses may be slow.
    await appointmentCheckPage.assertAppointmentDetailsShown();

    // Additional spot-check: confirm the appointment type is mentioned
    // UPDATE: Remove or adjust if the bot doesn't echo the appointment type.
    const latestMessage = await appointmentCheckPage.waitForBotResponse(45_000);
    const lower = latestMessage.toLowerCase();
    const mentionsAppointment = lower.includes('appointment') || lower.includes('booking');
    expect(
      mentionsAppointment,
      `Expected bot message to reference the appointment, but got:\n"${latestMessage}"`
    ).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // P-07: Bot explains cancellation / rescheduling rules
  //
  // WHAT: Asks the bot about cancelling or rescheduling an appointment and
  //   verifies the bot explains the relevant policy/rules.
  //
  // ACCEPTANCE CRITERIA:
  //   "Bot explains cancellation/rescheduling rules."
  //
  // IF THIS FAILS:
  //   • Update assertCancellationRulesExplained() in AppointmentCheckPage.ts
  //     with the exact keywords the HCH bot uses in its cancellation topic.
  //   • Verify the "cancellation/rescheduling" topic exists and is published
  //     in Copilot Studio / Power Virtual Agents.
  // ──────────────────────────────────────────────────────────────────────────

  test('P-07: bot explains cancellation and rescheduling rules', async ({
    appointmentCheckPage,
  }) => {
    await appointmentCheckPage.navigateToDynamicsApp();
    await appointmentCheckPage.openChatbot();

    // Ask about cancellation/rescheduling directly
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.cancellationQuery);

    // The bot must explain the relevant policy
    await appointmentCheckPage.assertCancellationRulesExplained();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // P-08: Bot offers escalation when automated change is unavailable
  //
  // WHAT: Asks the bot to speak to a human / escalate, and verifies the bot
  //   surfaces an escalation option (button, link, or text instruction).
  //
  // ACCEPTANCE CRITERIA:
  //   "Bot offers escalation if change cannot be automated."
  //
  // IF THIS FAILS:
  //   • Confirm the escalation topic / handoff is configured in Copilot Studio.
  //   • Update assertEscalationOffered() text keywords in AppointmentCheckPage.ts.
  //   • Update escalationLink() selector in AppointmentCheckPage.ts if a
  //     button/link is rendered but not being detected.
  // ──────────────────────────────────────────────────────────────────────────

  test('P-08: bot offers escalation to a human agent', async ({
    appointmentCheckPage,
  }) => {
    await appointmentCheckPage.navigateToDynamicsApp();
    await appointmentCheckPage.openChatbot();

    // Trigger appointment intent first (some bots require topic context before
    // the escalation path is accessible)
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.appointmentQuery);
    await appointmentCheckPage.assertIntentRecognized();

    // Ask to speak to a human / escalate
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.escalationQuery);

    // The bot must offer an escalation option
    await appointmentCheckPage.assertEscalationOffered();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // P-09: End-to-end multi-turn appointment check conversation
  //
  // WHAT: Simulates the full patient journey in a single multi-turn chat:
  //   Turn 1 — Patient asks to check their appointment (P-04)
  //   Turn 2 — Bot asks for ID; patient provides it (P-05)
  //   Turn 3 — Bot returns appointment details or clinic instructions (P-06)
  //   Turn 4 — Patient asks about cancellation rules; bot explains (P-07)
  //   Turn 5 — Patient asks to escalate; bot offers escalation option (P-08)
  //
  // ACCEPTANCE CRITERIA: All five acceptance criteria covered in sequence.
  //
  // TEST DATA:
  //   Appointment type : Post Procedure
  //   Date             : 02-03-2026
  //   Start time       : 12:00
  //   Duration         : 30 minutes
  //   Patient ID       : HCH_PATIENT_ID from .env
  //
  // WHY ONE TEST FOR ALL TURNS:
  //   A multi-turn chat is stateful — each turn depends on the bot's context
  //   from the previous turn.  Splitting across separate tests would require
  //   restarting the conversation and re-establishing context each time,
  //   which is both slower and less realistic.
  //
  // IF THIS FAILS:
  //   Run P-04 → P-08 individually first to isolate which turn is failing,
  //   then refer to the failure guidance in the relevant individual test above.
  // ──────────────────────────────────────────────────────────────────────────

  test('P-09: patient completes full appointment check conversation end-to-end', async ({
    appointmentCheckPage,
  }) => {

    // ── Setup: navigate to Dynamics 365 app and open the chatbot ────────────
    // The session is already authenticated via .auth/dynamics.json (saved by
    // global-setup.ts) so no manual login is needed.
    await appointmentCheckPage.navigateToDynamicsApp();
    await appointmentCheckPage.openChatbot();

    // ── Turn 1: Patient asks about their appointment ─────────────────────────
    // Triggers the appointment-check intent in the bot.
    // CHATBOT_MESSAGES.appointmentQuery = 'I want to check my appointment'
    console.log('[P-09] Turn 1 — asking about appointment');
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.appointmentQuery);

    // Assert the bot recognised the intent (did not return an "I don't understand" error)
    await appointmentCheckPage.assertIntentRecognized();

    // ── Turn 2: Patient provides their ID ────────────────────────────────────
    // The bot should have asked for the patient ID after Turn 1.
    // CHATBOT_MESSAGES.patientIdResponse = HCH_PATIENT_ID from .env (default: '12345')
    console.log('[P-09] Turn 2 — verifying bot asks for ID, then providing it');
    await appointmentCheckPage.assertBotAsksForPatientId();
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.patientIdResponse);

    // ── Turn 3: Bot returns appointment details ───────────────────────────────
    // After the patient provides their ID, the bot should either:
    //   (a) Show the Post Procedure appointment on 02-03-2026 at 12:00, OR
    //   (b) Provide clinic contact instructions if no live integration exists
    //
    // Expected test data context:
    //   Appointment type : ${APPOINTMENT_CHECK.type}
    //   Date             : ${APPOINTMENT_CHECK.date}
    //   Start time       : ${APPOINTMENT_CHECK.startTime}
    //   Duration         : ${APPOINTMENT_CHECK.durationMins} minutes
    console.log('[P-09] Turn 3 — verifying appointment details or fallback instructions');
    await appointmentCheckPage.assertAppointmentDetailsShown();

    // ── Turn 4: Patient asks about cancellation / rescheduling ───────────────
    // A follow-up question within the same conversation session.
    // CHATBOT_MESSAGES.cancellationQuery = 'How do I cancel or reschedule my appointment?'
    console.log('[P-09] Turn 4 — asking about cancellation rules');
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.cancellationQuery);
    await appointmentCheckPage.assertCancellationRulesExplained();

    // ── Turn 5: Patient requests escalation ──────────────────────────────────
    // The bot must surface an escalation path (button, link, or instruction)
    // when the automated flow cannot complete the patient's request.
    // CHATBOT_MESSAGES.escalationQuery = 'I need to speak to someone about my appointment'
    console.log('[P-09] Turn 5 — requesting escalation to a human agent');
    await appointmentCheckPage.sendMessage(CHATBOT_MESSAGES.escalationQuery);
    await appointmentCheckPage.assertEscalationOffered();

    // ── Final: page title still valid after full conversation ─────────────────
    const title = await appointmentCheckPage.getPageTitle();
    expect(title).not.toBe('');

    console.log('[P-09] End-to-end appointment check conversation completed successfully.');
  });

});
