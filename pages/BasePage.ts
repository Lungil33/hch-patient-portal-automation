// pages/BasePage.ts
// Abstract base class that every page object in this project extends.
//
// WHY THIS EXISTS:
// Rather than repeating common logic (navigation, waiting, reading env vars)
// in every page object, we centralise it here. Each feature area then gets
// its own page object (e.g. AppointmentBookingPage) that extends this class
// and adds only the selectors and actions specific to that feature.
//
// HOW TO USE:
//   1. Create a new file in pages/ — e.g. pages/MyFeaturePage.ts
//   2. import { BasePage } from './BasePage';
//   3. export class MyFeaturePage extends BasePage { ... }

import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  // The raw Playwright page — available to all subclasses
  protected readonly page: Page;

  // The portal's base URL, read from the env var specified in urlEnvVar
  protected readonly baseUrl: string;

  /**
   * @param page       Playwright Page instance
   * @param urlEnvVar  Name of the env var holding the base URL.
   *                   Defaults to 'HCH_PORTAL_URL' so existing page objects
   *                   require no changes.  Pass 'HCH_DYNAMICS_URL' for
   *                   Dynamics 365 / Power Apps page objects.
   */
  constructor(page: Page, urlEnvVar: string = 'HCH_PORTAL_URL') {
    this.page = page;
    this.baseUrl = process.env[urlEnvVar] ?? '';

    if (!this.baseUrl) {
      throw new Error(
        `${urlEnvVar} is not set.\n` +
        'Copy .env.example to .env and fill in the correct URL before running tests.'
      );
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  /**
   * Navigate to a path relative to the portal base URL and wait for the
   * page to load. Use this for any page-level navigation in subclasses.
   *
   * @param path  e.g. '/appointments/book' or '/login'
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(`${this.baseUrl}${path}`);
    await this.page.waitForLoadState('load');
  }

  /** Returns the current browser tab title — useful in smoke-test assertions. */
  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  /** Returns the current page URL — use this instead of accessing page.url() directly. */
  currentUrl(): string {
    return this.page.url();
  }

  // ── Waiting helpers ─────────────────────────────────────────────────────────

  /**
   * Wait for a locator to become visible.
   * Throws a human-readable error if the wait times out — much clearer than
   * Playwright's default "Timeout 20000ms exceeded" message.
   *
   * @param locator      The Playwright Locator to wait for
   * @param description  Plain-English label shown in the error message
   */
  async waitForVisible(locator: Locator, description: string): Promise<void> {
    await locator
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => {
        throw new Error(`Timed out waiting for element to be visible: "${description}"`);
      });
  }

  /**
   * Wait after an action (click, select, fill) for the UI to settle.
   *
   * Strategy:
   *   - If nextLocator is provided: wait for that element to become visible.
   *     Works for both full-page navigations and AJAX-driven DOM updates.
   *   - If no nextLocator: fall back to waitForLoadState('load').
   *
   * Always prefer passing nextLocator — it makes waits self-terminating and
   * avoids arbitrary timeouts.
   *
   * @param nextLocator  The element expected to appear after the action
   * @param description  Plain-English label for the error message if it times out
   */
  async waitAfterAction(nextLocator?: Locator, description?: string): Promise<void> {
    if (nextLocator) {
      await this.waitForVisible(nextLocator, description ?? 'next element after action');
    } else {
      await this.page.waitForLoadState('load');
    }
  }
}
