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

## Pass 4 · Requested refresh · 28 November 2026

- Removed the numbered email/code pills and the secondary account reassurance
  and showcase link from the shared entry view. Email submission still advances
  directly to code entry. Password mode no longer repeats “existing password”
  as a step label.
- Replaced the desktop sticker artwork with the existing Saigon image, a forest
  tint, and the approved leaf-line motif. On the code screen, centered the
  verification heading and mail icon and changed the six visual code slots to
  the underline treatment from the supplied reference. The accessible single
  input, six-digit length, autofill, resend, and recovery behavior are retained.
- Reviewed the local Expo web export in Chromium at desktop size and 390 × 844.
  The visual review showed the entry and offline-recovery states. The local API
  was unavailable, so the code-entry screen could not be reached for a rendered
  screenshot; no OTP was requested or sent during this pass. Native iOS and
  Android rendering, keyboard/focus behavior, and owner UAT remain pending.
- `pnpm --filter @finora/app build`, scoped ESLint, and app typecheck passed.
  No E2E or native-device check was run for this pass.

## Pass 5 · Login art and connection notice · 28 November 2026

- Replaced the large connection card on the sign-in view with one compact line
  below the primary action. “Try again” remains available inline.
- Added a purpose-made login illustration at
  `apps/app/assets/brand/login-hero.png` and used it as the desktop panel art.
  It was generated with the built-in imagegen tool; no existing brand artwork
  was overwritten.
- Reviewed the web export at desktop size and 390 × 844. The compact notice
  fits on one line at both sizes, and the new illustration renders in the
  desktop panel. The API remained unavailable during review, so no auth request
  was submitted. Native rendering and owner UAT remain pending.
- Build, scoped ESLint, app typecheck, and formatting checks passed. No E2E or
  native-device check was run for this pass.

## Pass 6 · Mobile and web auth refresh · 28 November 2026

- Reworked the shared mobile/web sign-in flow around the centered Finora mark,
  short email prompt, consistent input controls and a compact connection retry.
  Added a dedicated Google provider position; it stays visible but disabled
  without a helper line while the local API reports `google: false`. The API reports
  email OTP enabled. No additional provider was presented as available.
- Replaced the OTP illustration with a Finora verification mascot, shortened
  the copy, masked the destination address, and styled six rounded code cells.
  Kept the single accessible input, native one-time-code autofill, six-digit
  constraint, five-minute expiry, 30-second resend cooldown and duplicate-submit
  guard. Wrong and expired codes now have separate messages. Password mode has
  a visibility control and a direct route back to email-code sign-in.
- Reviewed the running Expo web app at 1280 × 720 and 390 × 844. The entry,
  password and OTP screens render without horizontal overflow. A synthetic local
  address reached the OTP screen; submitting a wrong code showed an inline error
  and left the edit-email and resend recovery actions available. The native iOS
  and Android layouts and keyboard were not exercised. Owner UAT remains pending.
- Google OAuth could not be exercised because the local server reports that
  provider disabled; its client credentials are not configured. Password reset
  remains unavailable because the server intentionally exposes no reset flow.
- App typecheck, scoped ESLint, formatting and web export passed. Five of eight
  auth E2E cases passed in Chrome. The three cases requiring an OTP failed at
  the synthetic Mailpit lookup because no matching message was available; the
  email/password screens and manual wrong-code recovery were verified in the
  browser. The other passing cases covered password sign-in, provider outage
  retry, session restoration and the public tour. No production account or inbox
  was used.

## Pass 7 · Centered mobile form and OTP hierarchy · 28 November 2026

- Removed the bottom login mascot and vertically centered the mobile form.
  Kept the OTP mascot in the verification view and hid the brand lockup there.
  The Google setup note is removed while the provider button remains reserved.
- Replaced the OTP information card with a centered instruction, masked email
  and five-minute validity. Added “Email không đúng? Đổi email” beneath it,
  and placed the resend action on the same line as the no-code prompt.
- Fixed the desktop artwork collapsing at the wide breakpoint by giving the
  image column a bounded height and flex sizing. Reviewed the live web app at
  390 × 844 and 1440 × 900; the login, OTP and desktop split layout rendered
  without the collapsed artwork. Native rendering and owner UAT remain pending.
- App typecheck, full lint, formatting and web export passed after the responsive
  fix. E2E remains 5/8 because local Mailpit did not provide OTP messages for
  the three end-to-end cases that need a delivered code.

## Pass 8 · Brand aligned with sign-in content · 28 November 2026

- Moved the Finora lockup and slogan into the centered sign-in group on mobile
  and into the desktop form column. Kept the top language control in place and
  kept the lockup hidden on OTP, where the verification mascot remains.
- Reviewed the running web app at 390 × 844 and 1440 × 900. The logo, heading
  and form now read as one vertically centered group. Typecheck, lint and web
  export passed after the change; native UAT remains pending.

## Pass 9 · Center against the full viewport · 28 November 2026

- Removed the fixed vertical offset and took the auth header out of content
  flow. The logo/form group now centers against the full safe viewport; language
  and back controls remain pinned at the top.
- Rechecked the web app at 390 × 844 and 1440 × 900. The group center aligned
  with the viewport center on both sizes. Typecheck, lint and web export passed.

## Pass 10 · Remove desktop login art · 28 November 2026

- Removed the desktop side image, its component and the unused image asset.
  Desktop and mobile now use the same centered, single-column login group;
  OTP keeps its verification mascot.
- Reviewed the live web app at 1440 × 900 and 390 × 844. The wide-screen form
  is centered with no left image; the mobile login layout remains intact.
  Native rendering and owner UAT remain pending.
- Full lint, typecheck, test and web build passed. No native-device or auth
  E2E run was needed for this layout-only change.

## Pass 11 · Remove browser focus outline on desktop · 28 November 2026

- Removed the browser's blue focus outline from auth inputs at desktop widths.
  The surrounding Finora focus border remains as the field's focus indicator;
  mobile and native styling are unchanged.
- Reviewed the focused email field in Chromium at 1440px. The blue outline is
  gone and the Finora field border remains visible. Full lint, typecheck, test
  and web build passed; mobile/native styling is unaffected by the desktop-only
  media rule.

## Pass 12 · Login focus motion · 28 November 2026

- On narrow screens, focusing the email or password field now lifts the brand
  and introduction by 22px over 110ms before the keyboard-driven layout shift.
  The input remains in normal keyboard-avoidance flow, while the header returns
  when focus leaves or the keyboard closes. Desktop focus behavior is unchanged.
- The typecheck passed. Chromium visual review could not run because the local
  Expo web server did not open its port in this environment. Native keyboard
  timing and owner UAT remain pending.
