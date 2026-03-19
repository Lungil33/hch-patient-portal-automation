// pages/PatientPortalLoginPage.ts
// Page object for the HCH patient portal login screen.
//
// RESPONSIBILITY:
//   Encapsulates all selectors and actions needed to log a patient in.
//   Used by global-setup.ts to save an authenticated session, and can also
//   be used directly in tests that need to verify the login flow itself.
//
// HOW TO UPDATE SELECTORS:
//   1. Open the HCH patient portal in Chrome.
//   2. Right-click the email field → "Inspect".
//   3. Copy the most stable attribute (prefer: data-testid, name, aria-label).
//   4. Replace the placeholder selectors below with the real ones.
//   Each selector has a comment explaining what HTML attribute to look for.

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PatientPortalLoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Locators ────────────────────────────────────────────────────────────────
  // Defined as arrow-function properties so Playwright re-evaluates them
  // after each navigation (avoids stale element references).

  /**
   * The email/username input field on the login form.
   * UPDATE: Replace with your portal's actual selector, e.g.:
   *   this.page.locator('[data-testid="email-input"]')
   *   this.page.locator('input[name="email"]')
   */
  private emailInput = () =>
    this.page.locator('input[type="email"], input[name="email"], input[name="username"]');

  /**
   * The password input field.
   * UPDATE: Replace with the portal's actual selector.
   */
  private passwordInput = () =>
    this.page.locator('input[type="password"], input[name="password"]');

  /**
   * The "Log in" / "Sign in" submit button.
   * UPDATE: Replace with the portal's actual selector, e.g.:
   *   this.page.getByRole('button', { name: /sign in/i })
   *   this.page.locator('[data-testid="login-submit"]')
   */
  private loginButton = () =>
    this.page.getByRole('button', { name: /log in|sign in|login/i });

  /**
   * An element that is only visible after a successful login —
   * used to verify that login worked.
   * UPDATE: Replace with a nav item, dashboard heading, or welcome message
   * that only appears when the patient is authenticated, e.g.:
   *   this.page.getByRole('heading', { name: /dashboard|my appointments/i })
   *   this.page.locator('[data-testid="patient-dashboard"]')
   */
  private postLoginIndicator = () =>
    this.page.getByRole('heading', { name: /dashboard|my appointments|welcome|home/i });

  // ── Actions ─────────────────────────────────────────────────────────────────

  /** Navigate to the login page. */
  async goToLoginPage(): Promise<void> {
    // UPDATE: Replace '/login' with the actual login path in the HCH portal.
    await this.navigateTo('/login');
  }

  /**
   * Fill in the email and password fields and click the login button.
   * Waits for the page to finish loading after the click.
   *
   * @param email     Patient's email address (read from .env in global-setup)
   * @param password  Patient's password (read from .env in global-setup)
   */
  async login(email: string, password: string): Promise<void> {
    await this.waitForVisible(this.emailInput(), 'email input field');
    await this.emailInput().fill(email);

    await this.waitForVisible(this.passwordInput(), 'password input field');
    await this.passwordInput().fill(password);

    await this.loginButton().click();

    // Wait for the redirect after login to complete
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ──────────────────────────────────────────────────────────────

  /**
   * Assert that the patient is now logged in by checking for a post-login element.
   * Call this after login() to confirm the login succeeded before continuing.
   */
  async assertLoginSuccessful(): Promise<void> {
    await expect(this.postLoginIndicator()).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Assert that the login page itself is visible (smoke test — no credentials needed).
   * Used by P-01 to verify the portal is reachable.
   */
  async assertLoginPageLoaded(): Promise<void> {
    await expect(this.emailInput()).toBeVisible({ timeout: 20_000 });
    await expect(this.loginButton()).toBeVisible({ timeout: 20_000 });
  }
}
