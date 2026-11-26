# FINORA product excellence sprint: review handoff

**Review branch:** `feat/finora-product-excellence`. The sprint started from `main` at
`a1b9030` and was integrated on top of `c5cf811`, after the LAN and Expo/Metro fixes
landed in PRs #12 and #13. The tested application revision is `e8b2b8a`; the branch head adds this documentation.
No production deployment, financial transaction, or direct push or merge to `main`
was part of this sprint.

## What changed

- **Access:** public, no-account borrowing-cost tour; OTP and provider-recovery flows that retain
  entered data and do not send the same accepted code twice. Unavailable providers are not
  shown as usable.
- **Home and navigation:** one financial summary using the user's own saved inputs, practical
  shortcuts, and a distinct next tracked payment. Saved estimates are not presented as actual
  debts. The approved draggable Liquid Glass dock remains the phone navigation.
- **Discovery and simulation:** sourced products are for information, not live offers.
  Borrowers can enter their own terms from scratch; sample comparisons use a shared amount
  and term. Results distinguish an unknown fee from zero. Calculation does not write a plan;
  saving a personal estimate requires confirmation and does not start repayment tracking.
- **Finora AI:** the main assistant is the guided borrowing workspace. Structured follow-ups
  retain validated Vietnamese inputs when applicable, ask about missing terms, and can compare
  terms without fabricating a rate. Finora AI and legacy chat histories can be cleared
  separately. Deterministic tools remain the default.
- **Private document review:** file selection and cancellation have a recovery path. The
  app explains missing PDF/image readers and highlights terms for manual review and
  correction before saving. The parsed document does not silently become a loan.
- **Profile and repayment:** linked the Home summary to its saved financial inputs and
  estimate; connected saved plans and the next due payment to their respective workflows.
  The ledger still requires user confirmation; it does not move money or query bank balances.
- **Local development:** [PR #12](https://github.com/teehihi/finora/pull/12) removed the
  previously generated Wi-Fi IP from local configuration. The preparation script is wired
  into the dev and build entry points. The local client uses the browser/Metro host; explicit
  remote HTTPS configuration stays intact. After changing networks, reconnect the phone to
  the current Metro URL or restart dev if Metro still advertises the old URL; nothing can
  connect a phone across isolated networks automatically.

## Design evidence

- [Baseline capability audit](PRODUCT_GAP_AUDIT.md)
- [Home directions and design decisions](design-system/PRODUCT_EXCELLENCE_RESEARCH.md)
- [Expanded FINORA mobile reference review](design-system/PRODUCT_EXCELLENCE_REFERENCES.md)
- [Financial calculation and unknown-fee assumptions](architecture/CALCULATIONS.md)
- [Sprint checkpoint](PRODUCT_EXCELLENCE_PROGRESS.md)

## Run locally

Use Node 22.20 and the repo's pnpm version. Run `pnpm install --frozen-lockfile`,
`pnpm run setup`, then `pnpm dev`. The normal setup uses Docker Compose for PostgreSQL
and Mailpit; the preview test run instead used the same services as isolated local
processes. Mailpit at `http://localhost:8025` is for synthetic email only. Leave
`EXPO_PUBLIC_API_URL` unset for local host discovery, and point it at a stable HTTPS API
only for preview/production. See the [README](../README.md) for setup and platform notes.

## Remaining product and verification work

1. Test on iPhone and Android hardware: Liquid Glass/fallback, gestures, notch/home
   indicator, external keyboard and input focus, larger text, screen reader and physical
   Wi-Fi handoff. Native bundle export alone does not cover these.
2. Verify opt-in remote inference with a supported provider key, only using synthetic
   questions, and verify Google/Apple OAuth on correctly configured development accounts.
   No real-provider, external SMTP, provider latency or production credential claim is
   made here. Local PDF extraction and manual correction do not imply OCR quality on
   arbitrary scanned Vietnamese contracts.
3. Maintain and date-check lender disclosures. Do not rank incomplete offers by total
   cost or promise approval. Run accessibility, performance and production security
   reviews before widening access.

## Verification evidence

| Scope                              | Result                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node 22.20.0 / pnpm 10.32.1        | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed. Nest compiled and Expo exported the release web assets.                                                                                                                                                                                                                                                                    |
| Calculation and service regression | 31 financial-engine tests, 52 API Jest tests, 34 app Jest tests, and 5 separate network/auth checks passed. The 7 PR-description script tests also passed.                                                                                                                                                                                                                                                           |
| Verified browser journeys          | **27 passed, none failed or skipped** in the final run. Chromium against the exported web app, an isolated PostgreSQL 17.12 instance, local storage and Mailpit 1.34. Covered OTP/recovery, profile and session restoration, sourced terms, personal/sample scenarios, Fin multi-turn planning, PDF review, explicit saves and repayments, and scoped deletion.                                                      |
| Visual evidence                    | The handoff archive contains the prior Home reference and current app captures, not mockups. Open `visuals/home-before-sprint-390.webp`, `visuals/home-light-390.png`, `visuals/home-dark-390.png`, `visuals/personal-simulation-390.png`, `visuals/intelligence-structured-light-390.png` and `visuals/document-review-light-390.png`. Browser layouts were checked at 360–1920 px, with screenshots at key widths. |
| Dev startup and Wi-Fi              | The root `pnpm dev` reached the LAN preparation step. The isolated environment blocked the filesystem socket used by `tsx watch` (`EPERM`); it could not finish live dev startup here. The built preview exercised real requests, and LAN behavior has focused regression tests. Physical Wi-Fi switching was not verified.                                                                                          |
| iOS and Android                    | Expo generated both Hermes bundles. No native compilation, signing, simulator/emulator runtime, hardware or native assistive-technology result is claimed for this sprint.                                                                                                                                                                                                                                           |
| AI, OAuth and production           | No live external inference, OAuth token exchange, external mail, production traffic or real documents. Local deterministic mode and mock-provider tests are not evidence of a live provider.                                                                                                                                                                                                                         |

Interim failures were not counted as passes: the preinstalled browser launcher initially had
no executable; a standalone Chromium was used afterward. A layout test still looked for
the old catch-all chat deletion button after the product switched to scoped history
deletion. Its check was updated to verify the new confirmation text, then rerun.
