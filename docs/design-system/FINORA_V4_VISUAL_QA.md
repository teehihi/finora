# FINORA 4.0 visual verification

Actual captures of the Expo Web app built from the workspace, not mockups. The baseline is upstream `dc15c6b` (the iOS-first Home changes were already on `main`). Both sides use separate disposable PostgreSQL 17 databases, real Better Auth and Mailpit. All users, repayment records and uploaded offers in the captures are synthetic; product cards marked as published show curated public terms, not personalized offers.

## Before and after

| Screen / viewport | Baseline                                             | FINORA 4.0                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home · 390 px     | [Before](screenshots/v4/before/home-light-390.webp)  | [After](screenshots/v4/after/home-light-390.webp), [upcoming repayment](screenshots/v4/after/home-upcoming-light-390.webp), [dark](screenshots/v4/after/home-dark-390.webp) |
| Home · 1440 px    | [Before](screenshots/v4/before/home-light-1440.webp) | [After](screenshots/v4/after/home-light-1440.webp)                                                                                                                          |
| Sign-in · 390 px  | [Before](screenshots/v4/before/auth-light-390.webp)  | [After](screenshots/v4/after/auth-light-390.webp)                                                                                                                           |
| Sign-in · 1440 px | [Before](screenshots/v4/before/auth-light-1440.webp) | [After, desktop review sheet](screenshots/v4/desktop-and-dark.webp)                                                                                                         |

Additional Home widths: [375](screenshots/v4/after/home-light-375.webp) · [430](screenshots/v4/after/home-light-430.webp) · [768](screenshots/v4/after/home-light-768.webp) · [1024](screenshots/v4/after/home-light-1024.webp). The assertions cover 375, 390, 430, 768, 1024 and 1440 px, including page overflow on every captured primary route. Dialogs, completed results and dark samples were checked separately. Repo copies are compressed; the browser captures were made at the labeled viewport dimensions.

## Major flows · 390 px

| Area                          | Rendered evidence                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public and entry              | [Public landing](screenshots/v4/after/public-landing-light-390.webp) · [Sign-in](screenshots/v4/after/auth-light-390.webp) · [Email OTP](screenshots/v4/after/otp-light-390.webp)                                                                                                                                 |
| Profile and settings          | [Empty financial profile](screenshots/v4/after/financial-profile-onboarding-light-390.webp) · [Appearance and language controls](screenshots/v4/after/settings-preferences-light-390.webp)                                                                                                                        |
| Loan marketplace              | [Discovery](screenshots/v4/after/discovery-light-390.webp) · [Published terms and source](screenshots/v4/after/loan-details-light-390.webp) · [Side-by-side comparison](screenshots/v4/after/comparison-light-390.webp)                                                                                           |
| Calculator and saved activity | [Simulator inputs](screenshots/v4/after/simulator-light-390.webp) · [Calculated breakdown](screenshots/v4/after/simulator-estimate-light-390.webp) · [Saved plan](screenshots/v4/after/saved-loan-light-390.webp) · [Loan activity](screenshots/v4/after/loan-activity-light-390.webp)                            |
| Finora AI and document review | [Assistant](screenshots/v4/after/assistant-light-390.webp) · [Structured analysis](screenshots/v4/after/intelligence-structured-light-390.webp) · [Document intake](screenshots/v4/after/document-intake-light-390.webp) · [PDF evidence and editable terms](screenshots/v4/after/document-review-light-390.webp) |
| Repayments                    | [Tracked loan and timeline](screenshots/v4/after/repayments-light-390.webp) · [Dark review sheet](screenshots/v4/desktop-and-dark.webp)                                                                                                                                                                           |

## Review and iteration

- Rendered and compared the [three Home directions](previews/v4/index.html) before the integrated app pass. The selected concept combines the branded financial summary and reachable quick actions familiar from Vietnamese banking apps with a clearly labeled planning estimate. Separate institution and user figures; never present estimated repayment room as an approved credit limit or lender offer.
- The integrated first pass had the right hierarchy, but the next-payment information was later than necessary at 390 px. The final pass tightened the Fin panel and made the whole panel tappable. Home now shows the actual next-payment row without requiring the same amount of scroll. Empty, populated and dark Home states were rendered separately.
- At tablet/desktop widths, the bottom dock becomes the existing adaptive rail and the two scenarios share a readable workspace. The [review sheet](screenshots/v4/desktop-and-dark.webp) shows desktop auth, discovery, structured analysis, and dark repayment/settings. The 390 px screen and the desktop sheet remain the same Expo application, not separate implementations.
- Desktop mouse drag failed on upstream and was reproduced with the first V4 build; browser-emulated touch worked. The final browser dock test uses a pointer at 390 px with reduced motion and confirms mouse and emulated touch release navigation, cancellation without route change, ordinary click, and keyboard Enter. The original complete borrowing journey, including real profile save, dock navigation, simulation, persistence and sign-out, passed after the fix.

## Reproduce the browser capture

With PostgreSQL and Mailpit ready per the [local setup guide](../../README.md), build the web and API targets and run:

```sh
FINORA_V4_CAPTURE_DIR=/tmp/finora-v4-captures \
FINORA_V4_LANDING_PATH=/showcase \
pnpm test:e2e tests/e2e/v4-visual.spec.ts
```

The spec waits for actual app states, submits an OTP delivered via SMTP to Mailpit, creates a real authenticated test account, seeds private synthetic data through owner-scoped APIs, runs loan analysis in local mock mode and uploads a synthetic PDF through the app. Capture is opt-in so regular functional tests do not write a screenshot set.

## Limits

Browser: headless Chromium, not an iPhone or Android device. iOS Liquid Glass's implementation remains in the native path; browser evidence verifies the separate fallback, not the material, safe-area behavior on physical hardware, keyboard animations, or haptics. No iOS Simulator or Android Emulator was available in the QA environment. Google/Apple credentials and live AI were not enabled; no lender, payment, third-party model or real customer data was used.
