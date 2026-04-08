# Playwright Wait-Strategy Overhaul — Design Spec
**Date:** 2026-04-08  
**Author:** Lungie  
**Status:** Approved  

---

## Problem Statement

The HCH automation suite has four confirmed bugs that prevent tests from running accurately:

1. **`networkidle` used in 9 places** across 4 files — causes 60 s timeouts on Dynamics 365 and is unreliable on SPAs where background requests never fully stop.
2. **TypeScript error in `clinic-finder.spec.ts:49`** — `loginPage.page` accesses a `protected` property, which is a compile-time error.
3. **No project scoping** — both `chromium` and `google-chrome` projects run all test files, doubling chatbot test executions from 7 to 14.
4. **`networkidle` in booking flow** — each step of the P-02 booking flow does a blind `networkidle` wait instead of waiting for the specific next element that indicates readiness.

Chatbot tests (P-03→P-09) fail because the widget is not yet deployed to UAT. These are left failing loudly as a deliberate signal that the feature is outstanding.

---

## Approach: Full Wait-Strategy Overhaul (Option C)

Centralise all waiting into `BasePage` with a `waitAfterAction()` helper. Replace every `networkidle` call with either element-specific waits or `load` fallbacks. Fix the TypeScript error. Add project scoping.

---

## Architecture

### 1. `BasePage` — new helpers

#### `waitAfterAction(nextLocator?: Locator, description?: string): Promise<void>`

The single wait utility used by all page objects. Strategy:

1. If `nextLocator` is provided: call `waitForVisible(nextLocator, description)` — works for both full-page navigations and AJAX-driven DOM updates (e.g. a dropdown loading after a selection).
2. If no `nextLocator`: fall back to `waitForLoadState('load')` as a safe minimum.

`domcontentloaded` is deliberately excluded — it only fires on full-page navigations and would hang indefinitely on AJAX-only actions.

This replaces every `waitForLoadState('networkidle')` call in the codebase. Page objects that know what element appears next pass it; those that don't get the `load` fallback.

#### `currentUrl(): string`

Thin public wrapper around `this.page.url()`. Fixes the `protected page` access error in `clinic-finder.spec.ts` without exposing the raw `Page` object.

#### `navigateTo()` update

Change `waitForLoadState('networkidle')` → `waitForLoadState('load')`.

---

### 2. `AppointmentBookingPage` — element-specific next-waits

Each action method passes the locator of the element that appears next in the flow to `waitAfterAction()`:

| Method | Next locator passed |
|--------|-------------------|
| `startBookingFlow()` | `serviceDropdown()` |
| `selectService()` | `providerDropdown()` |
| `selectProvider()` | `dateInput()` |
| `selectDate()` | `firstAvailableSlot()` |
| `selectFirstAvailableSlot()` | `confirmButton()` |
| `confirmBooking()` | `bookingConfirmationHeading()` |

Each method replaces its `waitForLoadState('networkidle')` call with `await this.waitAfterAction(<nextLocator>)`.

---

### 3. `PatientPortalLoginPage` — load fallback

`login()` replaces `waitForLoadState('networkidle')` with `waitAfterAction()` (no locator — load fallback). The post-login destination is portal-dependent and not yet confirmed against the real DOM.

---

### 4. `AppointmentCheckPage` — remove remaining `networkidle`

`openChatbot()` already has an element-specific wait after clicking. Remove the `waitForLoadState('networkidle')` call that precedes it. `navigateToDynamicsApp()` was already fixed in a prior commit.

---

### 5. `playwright.config.ts` — project scoping

Add `testMatch` to each project so each spec file runs in exactly one browser:

- `chromium` → `**/patient-booking.spec.ts`, `**/clinic-finder.spec.ts`
- `google-chrome` → `**/patient-check-appointments.spec.ts`

Reduces chatbot test executions from 14 → 7 and eliminates cross-browser noise on portal tests.

---

### 6. `clinic-finder.spec.ts` — fix TypeScript error

Line 49: `loginPage.page.url()` → `loginPage.currentUrl()`

---

## Files Changed

| File | Change |
|------|--------|
| `pages/BasePage.ts` | Add `waitAfterAction()`, add `currentUrl()`, fix `navigateTo()` |
| `pages/AppointmentBookingPage.ts` | Replace 6× `networkidle` with element-specific `waitAfterAction()` calls |
| `pages/PatientPortalLoginPage.ts` | Replace 1× `networkidle` with `waitAfterAction()` load fallback |
| `pages/AppointmentCheckPage.ts` | Remove 1× `networkidle` from `openChatbot()` |
| `playwright.config.ts` | Add `testMatch` to both projects |
| `tests/appointments/clinic-finder.spec.ts` | Fix `loginPage.page.url()` → `loginPage.currentUrl()` |

**No new files created. No test logic changed. Chatbot tests left failing loudly.**

---

## Error Handling

- `waitAfterAction()` with a locator: if the locator doesn't become visible within 20 s, the existing `waitForVisible()` helper throws a human-readable error — no change to error behaviour.
- `waitAfterAction()` without a locator: Playwright's built-in `waitForLoadState('load')` timeout applies (60 s from `navigationTimeout` in config).

---

## Testing / Verification

After implementation, run:

```bash
npx playwright test tests/appointments/patient-booking.spec.ts --reporter=line
npx playwright test tests/appointments/clinic-finder.spec.ts --reporter=line
npx playwright test tests/appointments/patient-check-appointments.spec.ts --reporter=line
```

Expected outcomes:
- P-01: pass (portal reachable, login form loads)
- P-02: pass or fail on selector mismatch (not on `networkidle` timeout)
- P-10: pass (invalid credentials rejected)
- P-03→P-09: fail loudly on chatbot widget not found (expected — chatbot not deployed)
- Each spec runs in exactly one browser (no duplicate runs)
