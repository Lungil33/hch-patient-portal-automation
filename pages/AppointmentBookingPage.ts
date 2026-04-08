// pages/AppointmentBookingPage.ts
// Page object for the HCH patient portal appointment booking flow.
//
// RESPONSIBILITY:
//   Encapsulates every selector and action needed to book an appointment.
//   The booking flow has four sequential steps:
//     Step 1 → Select a service / appointment type
//     Step 2 → Select a provider / clinician
//     Step 3 → Select a preferred date
//     Step 4 → Select an available time slot
//   …followed by a booking confirmation step.
//
// HOW TO UPDATE SELECTORS:
//   Open the HCH portal's booking page in Chrome DevTools and inspect each
//   element. Replace the placeholder selectors below with the real ones.
//   Each selector has a comment explaining where to look.

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AppointmentBookingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Locators ────────────────────────────────────────────────────────────────

  /**
   * The "Book an appointment" link / button on the patient dashboard or nav.
   * UPDATE: Match the exact label or use a data-testid, e.g.:
   *   this.page.locator('[data-testid="book-appointment-btn"]')
   *   this.page.getByRole('link', { name: /book an appointment/i })
   */
  private bookAppointmentLink = () =>
    this.page.getByRole('link', { name: /book.*(appointment|appointment)/i });

  /**
   * Step 1 — Service / appointment type selector.
   * UPDATE: This is often a <select> dropdown or a custom list. Examples:
   *   this.page.getByLabel('Service type')
   *   this.page.locator('select[name="serviceType"]')
   *   this.page.locator('[data-testid="service-select"]')
   */
  private serviceDropdown = () =>
    this.page.getByLabel(/service type|appointment type|reason for visit/i);

  /**
   * Step 2 — Provider / clinician selector.
   * UPDATE: Could be a dropdown, radio group, or card list, e.g.:
   *   this.page.getByLabel('Provider')
   *   this.page.locator('[data-testid="provider-select"]')
   */
  private providerDropdown = () =>
    this.page.getByLabel(/provider|clinician|doctor|practitioner/i);

  /**
   * Step 3 — Preferred date input.
   * UPDATE: This is commonly an <input type="date"> or a date picker, e.g.:
   *   this.page.locator('input[type="date"]')
   *   this.page.getByLabel('Preferred date')
   *   this.page.locator('[data-testid="date-picker"]')
   */
  private dateInput = () =>
    this.page.locator('input[type="date"]').or(
      this.page.getByLabel(/preferred date|select date|date/i)
    );

  /**
   * Step 4 — Available time slot buttons/links.
   * UPDATE: Slots are often rendered as a list of <button> elements.
   * Replace the selector to match the real slot elements, then call .first()
   * to pick the first available slot, or filter by specific text, e.g.:
   *   this.page.locator('[data-testid="time-slot"]').first()
   *   this.page.getByRole('button', { name: /am|pm/ }).first()
   */
  private firstAvailableSlot = () =>
    this.page.getByRole('button', { name: /^\d{1,2}:\d{2}\s*(am|pm)?$/i }).first();

  /**
   * The "Confirm booking" / "Book now" button shown at the review step.
   * UPDATE: Match the exact label used in the portal, e.g.:
   *   this.page.getByRole('button', { name: /confirm booking/i })
   *   this.page.locator('[data-testid="confirm-btn"]')
   */
  private confirmButton = () =>
    this.page.getByRole('button', { name: /confirm booking|book now|confirm|submit/i });

  /**
   * Confirmation message / page heading shown after a successful booking.
   * UPDATE: Match whatever success indicator the portal shows, e.g.:
   *   this.page.getByRole('heading', { name: /booking confirmed/i })
   *   this.page.locator('[data-testid="booking-success"]')
   *   this.page.getByText(/your appointment has been booked/i)
   */
  private bookingConfirmationHeading = () =>
    this.page.getByRole('heading', {
      name: /booking confirmed|appointment confirmed|thank you|success/i,
    });

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Navigate to the booking start page from the patient dashboard.
   * Clicks the "Book an appointment" link and waits for the service dropdown.
   */
  async startBookingFlow(): Promise<void> {
    await this.waitForVisible(this.bookAppointmentLink(), '"Book an appointment" link');
    await this.bookAppointmentLink().click();
    await this.waitAfterAction(this.serviceDropdown(), 'service type dropdown');
  }

  /**
   * Step 1 — Select the service / appointment type from the dropdown.
   * Waits for the provider dropdown to appear after the selection.
   *
   * @param serviceType  Must exactly match a valid option in the portal
   *                     (set via HCH_SERVICE_TYPE in .env)
   */
  async selectService(serviceType: string): Promise<void> {
    await this.waitForVisible(this.serviceDropdown(), 'service type dropdown');
    await this.serviceDropdown().selectOption({ label: serviceType });
    await this.waitAfterAction(this.providerDropdown(), 'provider dropdown');
  }

  /**
   * Step 2 — Select the provider / clinician.
   * Waits for the date input to appear after the selection.
   *
   * @param providerName  Must exactly match a valid option in the portal
   *                      (set via HCH_PROVIDER_NAME in .env)
   */
  async selectProvider(providerName: string): Promise<void> {
    await this.waitForVisible(this.providerDropdown(), 'provider dropdown');
    await this.providerDropdown().selectOption({ label: providerName });
    await this.waitAfterAction(this.dateInput(), 'date input');
  }

  /**
   * Step 3 — Enter the preferred date.
   * Waits for available time slots to appear after the date is entered.
   *
   * @param date  e.g. '2026-04-01' (set via HCH_PREFERRED_DATE in .env)
   */
  async selectDate(date: string): Promise<void> {
    await this.waitForVisible(this.dateInput(), 'date input');
    await this.dateInput().fill(date);
    await this.dateInput().press('Tab');
    await this.waitAfterAction(this.firstAvailableSlot(), 'first available time slot');
  }

  /**
   * Step 4 — Click the first available time slot.
   * Waits for the confirm button to appear after selecting a slot.
   */
  async selectFirstAvailableSlot(): Promise<void> {
    await this.waitForVisible(this.firstAvailableSlot(), 'first available time slot');
    await this.firstAvailableSlot().click();
    await this.waitAfterAction(this.confirmButton(), '"Confirm booking" button');
  }

  /**
   * Final step — click "Confirm booking" to submit the appointment.
   * Waits for the confirmation heading to appear after submission.
   */
  async confirmBooking(): Promise<void> {
    await this.waitForVisible(this.confirmButton(), '"Confirm booking" button');
    await this.confirmButton().click();
    await this.waitAfterAction(this.bookingConfirmationHeading(), 'booking confirmation');
  }

  // ── Assertions ──────────────────────────────────────────────────────────────

  /**
   * Assert that the booking confirmation page/message is visible.
   * Called at the end of the E2E booking test to verify success.
   */
  async assertBookingConfirmed(): Promise<void> {
    await expect(this.bookingConfirmationHeading()).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Assert that the booking form has loaded and is ready to interact with.
   * Used in smoke tests and as a precondition check before filling the form.
   */
  async assertBookingFormLoaded(): Promise<void> {
    await expect(this.serviceDropdown()).toBeVisible({ timeout: 20_000 });
  }
}
