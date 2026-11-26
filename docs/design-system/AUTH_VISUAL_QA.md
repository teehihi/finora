# Auth 2.0 visual iterations

Screenshots are from the Expo web export running locally in Chromium with the
Finora API, isolated PostgreSQL 17 and Mailpit. They are not design mockups.
All visible addresses are synthetic.

| Pass | Review and change                                                                                                                                                                                                                                                                      | Evidence                                                                                                                                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Established a forest-and-paper split with an email-first entry and a secondary password path. At 390px the form stayed legible, but the resend and edit links interrupted the primary code task; the decorative desktop curves looked like financial data without explaining anything. | [Desktop starting point](screenshots/auth-iterations/01-entry-desktop.webp)                                                                                                                                                            |
| 2    | Replaced the decorative curves with three concrete borrowing decisions. Put Verify immediately below the code and moved resend/edit below it. The browser still held focus on a button, and the mobile OTP view repeated marketing copy.                                               | [Mobile OTP after reordering](screenshots/auth-iterations/02-otp-mobile.webp)                                                                                                                                                          |
| 3    | Shortened the mobile code header to a step label; moved focus to the real code input upon arrival; used a smaller desktop heading at 1024px to retain a deliberate two-line lockup. Resend feedback now corresponds to the 30-second server cooldown.                                  | [1024px entry](screenshots/auth-iterations/auth-1024.webp), [1440px entry](screenshots/auth-iterations/auth-1440.webp), [390px OTP](screenshots/auth-iterations/otp-390.webp), [1440px OTP](screenshots/auth-iterations/otp-1440.webp) |

Final entry and password screens rendered at 360, 390, 430, 768, 1024, 1440
and 1920px. No horizontal overflow showed at these widths; measured entry
buttons and input were at least 44 CSS px tall. The OTP field was the active
element at both 390 and 1440px.

Both browser tests in `tests/e2e/auth.spec.ts` passed. The first received a real
Mailpit email, rejected the wrong code, normalized the pasted code and restored
the new session after reload. The second verified a signed-in legacy user's
email and signed in again with the same password. Native visual behavior and
the external Google account handoff were not exercised here.
