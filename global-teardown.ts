// global-teardown.ts
// Runs ONCE after all tests in the suite have completed.
//
// PURPOSE:
//   Clean up any test data created during the run — for example, cancelling
//   appointments that were booked by the P-02 test so the portal's test data
//   stays clean and the same test can be run again tomorrow.
//
// CURRENTLY:
//   This is a placeholder. Add cleanup logic below when you are ready.
//   A common pattern is to call the portal's API directly (if available)
//   to delete or cancel test bookings by ID.

import * as dotenv from 'dotenv';
dotenv.config();

async function globalTeardown(): Promise<void> {
  console.log('[global-teardown] Test run complete.');

  // TODO: Cancel/delete the test appointment created by P-02.
  //
  // Option A — Use the portal's REST API (if it exposes one):
  //
  //   const baseUrl = process.env.HCH_PORTAL_URL;
  //   const token   = await getPatientAuthToken(); // implement separately
  //   await fetch(`${baseUrl}/api/appointments/${createdAppointmentId}`, {
  //     method: 'DELETE',
  //     headers: { Authorization: `Bearer ${token}` },
  //   });
  //
  // Option B — Navigate to "My appointments" and cancel via the UI:
  //   Use a second Playwright session here to log in and cancel the booking.
  //
  // For now, if re-running tests creates duplicate bookings in the portal,
  // cancel them manually or add your cleanup logic above.
}

export default globalTeardown;
