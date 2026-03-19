// pages/AppointmentCheckPage.ts
//
// ════════════════════════════════════════════════════════════════════════════════
//  HCH AUTOMATION — Appointment Check Page Object (Chatbot)
//  Author: Lungie | Created: 19 March 2026
// ════════════════════════════════════════════════════════════════════════════════
//
// WHAT THIS FILE DOES:
//   Page Object Model for the chatbot-based appointment checking flow on the
//   HCH Dynamics 365 / Power Apps UAT environment.
//
//   The bot is expected to:
//     1. Recognise appointment-related questions (intent recognition)
//     2. Ask for the patient's ID (minimal info collection)
//     3. Return appointment details (date, time, provider) — OR fall back to
//        clinic contact instructions if no live integration exists
//     4. Explain cancellation / rescheduling rules
//     5. Offer escalation to a human agent when automation is unavailable
//
// IMPORTANT — SELECTOR GUIDANCE:
//   All locators below include multiple fallbacks via .or() and are intentionally
//   broad so they survive minor HTML changes.  Once you have the real application
//   open in Edge dev-tools, replace each selector family with the precise
//   data-test-id / aria-label found in the DOM.  Every locator has an
//   "UPDATE:" comment marking exactly which string to change.
//
// AUTH:
//   This page uses HCH_DYNAMICS_URL as its base, via BasePage's urlEnvVar param.
//   The session is pre-authenticated by global-setup.ts (dynamics auth block)
//   and stored in .auth/dynamics.json.

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AppointmentCheckPage extends BasePage {

  // ── Constructor ────────────────────────────────────────────────────────────
  // Passes 'HCH_DYNAMICS_URL' so BasePage reads the Dynamics 365 URL instead
  // of the patient portal URL.  All other BasePage helpers work as normal.
  constructor(page: Page) {
    super(page, 'HCH_DYNAMICS_URL');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOCATORS
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Each locator is defined as an arrow function so it is re-evaluated after
  // navigation.  Using functions (rather than storing Locators in properties)
  // prevents stale element references.
  //
  // SELECTOR STRATEGY:
  //   Priority 1 — data-test-id (most stable, immune to visual changes)
  //   Priority 2 — aria-label / role (semantic, accessible)
  //   Priority 3 — CSS class / tag (last resort — brittle to redesigns)
  //
  // Every locator uses .or() to chain fallbacks so the test works even if
  // the portal uses different attribute names across environments.

  // ── Chatbot trigger button ─────────────────────────────────────────────────
  // The floating "chat" icon or button that opens the bot panel.
  //
  // UPDATE: Replace the selectors below with the exact attribute found in
  // the Dynamics 365 app.  Common patterns for Power Virtual Agents / Copilot
  // Studio embeds:
  //   • <button data-id="chatbot-trigger">
  //   • <button aria-label="Open chat">
  //   • <iframe title="Chat widget"> (the widget may live inside an iframe)
  chatbotButton(): Locator {
    return this.page
      .getByTestId('chatbot-trigger')                          // UPDATE: data-test-id
      .or(this.page.getByRole('button', { name: /chat|bot|help|support/i }))  // aria-label fallback
      .or(this.page.locator('button[aria-label*="chat" i]'))  // CSS fallback
      .or(this.page.locator('[data-id="chatbot-trigger"]'));   // Dynamics data-id fallback
  }

  // ── Chat text input ────────────────────────────────────────────────────────
  // The input box inside the open chatbot panel where the patient types.
  //
  // UPDATE: Check inside the chatbot iframe (if applicable) first.
  // If the bot renders inside an <iframe>, you must call:
  //   this.page.frameLocator('iframe[title*="chat" i]').locator('textarea')
  // instead of this.page.locator() directly.
  chatInput(): Locator {
    return this.page
      .getByTestId('chat-input')                              // UPDATE: data-test-id
      .or(this.page.getByPlaceholder(/type a message|ask me/i))
      .or(this.page.locator('textarea[aria-label*="message" i]'))
      .or(this.page.locator('input[aria-label*="message" i]'))
      .or(this.page.locator('[data-id="webchat__send-icon"]').locator('..').locator('input, textarea'));
  }

  // ── Send button ────────────────────────────────────────────────────────────
  // The "Send" button (or Enter key is used — see sendMessage() below).
  //
  // UPDATE: Some chatbots submit on Enter only.  If so, remove the click
  // in sendMessage() and keep only the key press.
  sendButton(): Locator {
    return this.page
      .getByTestId('chat-send-button')                        // UPDATE: data-test-id
      .or(this.page.getByRole('button', { name: /send/i }))
      .or(this.page.locator('button[aria-label*="send" i]'))
      .or(this.page.locator('[data-id="webchat__send-icon"]'));
  }

  // ── Latest bot message ────────────────────────────────────────────────────
  // The most recent message bubble sent BY the bot (not the patient).
  //
  // UPDATE: Power Virtual Agents / Copilot Studio uses role="log" containing
  // individual message bubbles.  Inspect the chat widget HTML to find the
  // exact element.  Common patterns:
  //   • div[data-activity-key] (Bot Framework Web Chat)
  //   • .wc-message-content (older Bot Framework)
  //   • [data-testid="bubble"] inside role="log"
  latestBotMessage(): Locator {
    return this.page
      .getByTestId('bot-message')                             // UPDATE: data-test-id
      .last()
      .or(
        this.page
          .locator('[role="log"] [data-activity-key]')        // Bot Framework Web Chat
          .filter({ hasText: /.+/ })
          .last()
      )
      .or(this.page.locator('.wc-message-from-bot').last())   // legacy Bot Framework
      .or(this.page.locator('[data-id="bot-message"]').last());
  }

  // ── All bot messages ──────────────────────────────────────────────────────
  // Returns the full list of bot message bubbles — used in multi-turn assertions.
  allBotMessages(): Locator {
    return this.page
      .getByTestId('bot-message')                             // UPDATE: data-test-id
      .or(this.page.locator('[role="log"] [data-activity-key]').filter({ hasText: /.+/ }))
      .or(this.page.locator('.wc-message-from-bot'))
      .or(this.page.locator('[data-id="bot-message"]'));
  }

  // ── Appointment detail card ───────────────────────────────────────────────
  // Structured card the bot renders showing date, time, and provider when
  // integration is live.  May not be present if integration is unavailable
  // (in that case the bot sends a plain text fallback instead).
  //
  // UPDATE: Check whether the bot renders an Adaptive Card (common in
  // Power Virtual Agents) — if so look for:
  //   [data-testid="adaptive-card"] or .ac-container
  appointmentDetailCard(): Locator {
    return this.page
      .getByTestId('appointment-detail-card')                 // UPDATE: data-test-id
      .or(this.page.locator('[data-testid="adaptive-card"]')) // Adaptive Card
      .or(this.page.locator('.ac-container'))                 // Adaptive Card renderer
      .or(this.page.locator('[data-id="appointment-card"]'));
  }

  // ── Escalation link / button ──────────────────────────────────────────────
  // The CTA the bot shows when it cannot automate the change
  // (e.g. "Speak to a person", "Transfer to agent", "Call clinic").
  //
  // UPDATE: In Copilot Studio this is typically a Suggested Action button or
  // an Adaptive Card button with the escalation topic mapped.
  escalationLink(): Locator {
    return this.page
      .getByTestId('escalation-cta')                          // UPDATE: data-test-id
      .or(this.page.getByRole('button', { name: /speak to|transfer|agent|escalat|call|contact/i }))
      .or(this.page.getByRole('link',   { name: /speak to|transfer|agent|escalat|call|contact/i }))
      .or(this.page.locator('[data-id="escalation-button"]'));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Navigate to Dynamics 365 app ──────────────────────────────────────────
  // Uses page.goto() with the full absolute URL from HCH_DYNAMICS_URL because
  // the Dynamics URL contains query parameters and cannot be built from a
  // relative path.
  async navigateToDynamicsApp(): Promise<void> {
    // baseUrl is already the full Dynamics 365 URL from HCH_DYNAMICS_URL
    await this.page.goto(this.baseUrl);
    // Dynamics 365 can be slow to initialise all iframes — networkidle is safer
    await this.page.waitForLoadState('networkidle');
    // Wait for the main Dynamics content area to be present
    // UPDATE: Replace with a more specific selector once you know the app structure
    await this.page
      .locator('[data-id="mainContent"], #mainContent, [role="main"]')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 })
      .catch(() => {
        // Non-fatal: the selector may differ — proceed anyway
        console.warn('navigateToDynamicsApp: mainContent selector not found; proceeding.');
      });
  }

  // ── Open the chatbot panel ────────────────────────────────────────────────
  // Clicks the floating chat button to reveal the chat window.
  // If the chatbot is already open (e.g. auto-launches on page load),
  // this action will be a no-op because the button won't be visible.
  async openChatbot(): Promise<void> {
    const btn = this.chatbotButton();
    const isVisible = await btn.isVisible().catch(() => false);

    if (isVisible) {
      await btn.click();
      await this.page.waitForLoadState('networkidle');
    }
    // If the button is not found, assume the chat panel is already open
    // (some Power Apps chatbots auto-expand).

    // Wait for the chat input to be ready
    await this.waitForVisible(this.chatInput(), 'chatbot input field');
  }

  // ── Send a message to the bot ─────────────────────────────────────────────
  // Types the given text into the chat input and submits it.
  // Tries clicking Send first; falls back to pressing Enter if Send is absent.
  async sendMessage(text: string): Promise<void> {
    const input = this.chatInput();
    await this.waitForVisible(input, 'chat input');
    await input.fill(text);

    // Try the Send button; if it is not present use Enter key instead
    const sendBtn  = this.sendButton();
    const hasSendBtn = await sendBtn.isVisible().catch(() => false);

    if (hasSendBtn) {
      await sendBtn.click();
    } else {
      await input.press('Enter');
    }
  }

  // ── Wait for the bot to reply ─────────────────────────────────────────────
  // Waits until a new bot message appears and returns its text content.
  // Pass a longer timeoutMs for slow integration-backed responses.
  async waitForBotResponse(timeoutMs: number = 30_000): Promise<string> {
    const latest = this.latestBotMessage();
    await latest.waitFor({ state: 'visible', timeout: timeoutMs });
    return (await latest.textContent()) ?? '';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ASSERTIONS
  // ══════════════════════════════════════════════════════════════════════════

  // ── P-03: App loads ───────────────────────────────────────────────────────
  async assertDynamicsAppLoaded(): Promise<void> {
    const title = await this.page.title();
    expect(title).not.toBe('');
    // The Dynamics 365 page title typically contains the app name or "Dynamics"
    // UPDATE: Adjust the regex if the page title differs in your UAT tenant.
    // expect(title).toMatch(/dynamics|hch|health/i);
  }

  // ── P-03: Chatbot widget visible ──────────────────────────────────────────
  async assertChatbotWidgetVisible(): Promise<void> {
    // The widget is visible when either the trigger button OR the chat input is present
    const btn   = this.chatbotButton();
    const input = this.chatInput();

    const btnVisible   = await btn.isVisible().catch(() => false);
    const inputVisible = await input.isVisible().catch(() => false);

    expect(
      btnVisible || inputVisible,
      'Chatbot widget should be visible — either the trigger button or the open input must be present.\n' +
      'UPDATE: Check AppointmentCheckPage.ts chatbotButton() and chatInput() selectors.'
    ).toBe(true);
  }

  // ── P-04: Intent recognised ───────────────────────────────────────────────
  // Confirms the bot produced a meaningful reply (i.e. recognised the intent
  // rather than returning a generic "I did not understand" error).
  async assertIntentRecognized(): Promise<void> {
    const responseText = await this.waitForBotResponse();

    // The bot should NOT reply with a generic unknown-intent message.
    // UPDATE: Replace these phrases with the exact "not understood" wording
    // used by the HCH bot so false positives are avoided.
    const unrecognisedPhrases = [
      "i didn't understand",
      "i don't understand",
      "i'm not sure what you mean",
      "sorry, i couldn't",
      "can you rephrase",
    ];

    const lowerResponse = responseText.toLowerCase();
    const isUnrecognised = unrecognisedPhrases.some(phrase => lowerResponse.includes(phrase));

    expect(
      isUnrecognised,
      `Bot returned an unrecognised-intent message: "${responseText}"\n` +
      'If the bot is supposed to handle this query, check the intent mapping in Copilot Studio / Power Virtual Agents.'
    ).toBe(false);

    // Additionally the bot must have replied with SOMETHING
    expect(responseText.trim().length).toBeGreaterThan(0);
  }

  // ── P-05: Bot asks for patient ID ─────────────────────────────────────────
  // Checks that the bot requests minimal identifying information (patient ID,
  // date of birth, or similar) before returning appointment details.
  async assertBotAsksForPatientId(): Promise<void> {
    const responseText = await this.waitForBotResponse();
    const lower = responseText.toLowerCase();

    // UPDATE: Adjust these phrases to match the exact wording the HCH bot uses
    // when asking for identification (e.g. "patient number", "date of birth").
    const idRequestPhrases = [
      'patient id',
      'patient number',
      'id number',
      'date of birth',
      'can you confirm',
      'please provide',
      'could you share',
      'what is your',
    ];

    const asksForId = idRequestPhrases.some(phrase => lower.includes(phrase));
    expect(
      asksForId,
      `Expected the bot to ask for patient identification, but it said:\n"${responseText}"\n` +
      'UPDATE: Check assertBotAsksForPatientId() in AppointmentCheckPage.ts and adjust ' +
      'idRequestPhrases to match the actual bot wording.'
    ).toBe(true);
  }

  // ── P-06: Appointment details shown OR clinic instructions provided ────────
  // After the patient supplies their ID, the bot should either:
  //   (a) Show structured appointment data — date, time, provider; OR
  //   (b) Provide clear instructions for checking with the clinic directly
  //       (e.g. phone number, patient portal link, email address)
  async assertAppointmentDetailsShown(): Promise<void> {
    const responseText = await this.waitForBotResponse(45_000); // integration may be slow
    const lower = responseText.toLowerCase();

    // Check for integration-backed appointment details
    // UPDATE: Adjust date format regex to match how the bot formats dates.
    const hasDatePattern   = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(responseText);
    const hasTimePattern   = /\d{1,2}:\d{2}\s*(am|pm)?/i.test(responseText);
    const hasAppointmentKw = ['appointment', 'booking', 'scheduled', 'confirmed'].some(kw => lower.includes(kw));

    // Check for acceptable clinic-fallback instructions
    // UPDATE: Replace with the exact fallback wording used by your HCH bot.
    const hasFallbackKw = [
      'please call',
      'contact the clinic',
      'phone',
      'email',
      'patient portal',
      'reception',
      'speak to',
    ].some(kw => lower.includes(kw));

    const hasIntegrationData = (hasDatePattern || hasTimePattern) && hasAppointmentKw;
    const hasFallback        = hasFallbackKw;

    expect(
      hasIntegrationData || hasFallback,
      `Bot did not return appointment details or clinic instructions.\nResponse: "${responseText}"\n` +
      'EXPECTED: Either structured appointment data (date/time/provider) OR ' +
      'clear instructions for checking with the clinic.\n' +
      'UPDATE: Adjust assertAppointmentDetailsShown() keyword lists to match real bot output.'
    ).toBe(true);
  }

  // ── P-07: Cancellation / rescheduling rules explained ─────────────────────
  // The bot must tell the patient the rules around cancellation/rescheduling
  // (e.g. notice period, penalties, how to request a change).
  async assertCancellationRulesExplained(): Promise<void> {
    const responseText = await this.waitForBotResponse();
    const lower = responseText.toLowerCase();

    // UPDATE: Replace with exact keywords or phrases from the HCH bot's
    // cancellation / rescheduling topic.
    const cancellationKeywords = [
      'cancel',
      'reschedul',
      'notice',
      'hours',
      'policy',
      'change',
      'modify',
    ];

    const rulesMentioned = cancellationKeywords.some(kw => lower.includes(kw));
    expect(
      rulesMentioned,
      `Bot did not explain cancellation/rescheduling rules.\nResponse: "${responseText}"\n` +
      'UPDATE: Adjust assertCancellationRulesExplained() keywords to match real bot wording.'
    ).toBe(true);
  }

  // ── P-08: Escalation offered ──────────────────────────────────────────────
  // When the bot cannot automate a change, it must offer the patient a way to
  // reach a human agent (button, link, or plain-text instruction).
  async assertEscalationOffered(): Promise<void> {
    const responseText = await this.waitForBotResponse();
    const lower = responseText.toLowerCase();

    // Check for escalation text in the bot message
    const textEscalation = [
      'speak to',
      'transfer',
      'agent',
      'human',
      'staff',
      'call us',
      'contact',
      'reception',
    ].some(kw => lower.includes(kw));

    // Check for an escalation button/link in the UI
    const escalationBtn = this.escalationLink();
    const btnVisible    = await escalationBtn.isVisible().catch(() => false);

    expect(
      textEscalation || btnVisible,
      `Bot did not offer escalation to a human agent.\nResponse: "${responseText}"\n` +
      'EXPECTED: Escalation option in bot message text or a visible escalation button.\n' +
      'UPDATE: Adjust assertEscalationOffered() keywords and escalationLink() selector.'
    ).toBe(true);
  }
}
