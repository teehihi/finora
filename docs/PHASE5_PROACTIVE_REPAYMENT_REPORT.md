# FINORA · Phase 5 completion report

Date: 28 November 2026. Branch: `codex/phase5-proactive-repayment`.

## Delivered

- Reused saved simulation snapshots and the deterministic repayment schedule. A user now distinguishes planned, explicitly confirmed active, completed by manual records, and archived loans. Saving a simulation alone still creates no obligation.
- Added cumulative partial payment recording, correction history, idempotency request IDs and owner-scoped state changes. Existing boolean payment entries remain readable. No manual record is described as lender evidence.
- Extended the existing 90-day cash flow engine with one-off expenses. The preparation form uses reported available funds, income/expense dates and amounts, other tracked obligations and required reserve. Missing facts return a named missing-field response. The result shows reserve gap, daily/weekly goal and first cash shortfall; it is a scenario, not a guaranteed forecast.
- Added persistent in-app due reminders, overdue recovery, projection shortfall and low-reserve alerts, close-together obligations, optional profile review, per-user timezone and quiet hours. Queued reminders are deduplicated and canceled when no longer relevant. Optional generic email requires an enabled server flag, verified address and user opt-in. The email contains no financial amount or loan title. Push is shown as unavailable because no push infrastructure exists.
- Added notification center, settings, preparation screen, ledger progress/history and a read-only `monitorRepayments` Fin tool. Vietnamese and English copy follows the existing design system.
- Applied three committed SQL migrations to the existing local PostgreSQL 17 volume; no reset or production data was used.

## Main changed areas

| Area                       | Files                                                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contracts and calculations | `packages/contracts/src/repayments.ts`, `packages/financial-engine/src/cashflow.ts`, `repayment-preparation.ts`                                                                         |
| Database and API           | `packages/database/prisma/schema.prisma`, three `20261128` migrations, `apps/api/src/modules/repayment-*`, `notification-service.ts`, `notifications.ts`                                |
| Fin and client             | `apps/api/src/modules/intelligence.ts`, `packages/contracts/src/intelligence.ts`, `packages/api-client/src/index.ts`                                                                    |
| UI and language            | `apps/app/app/(workspace)/repayments.tsx`, `notifications.tsx`, `prepare/[id].tsx`, `apps/app/src/features/repayments.tsx`, `packages/i18n/src/repayment-proactive.ts`                  |
| Tests and docs             | `apps/api/test/repayment-*.test.ts`, `packages/financial-engine/test/repayment-preparation.test.ts`, `tests/e2e/proactive-repayment.spec.ts`, `docs/architecture/REPAYMENT_TRACKING.md` |

## Verification on this workstation

`pnpm run setup` applied the local migrations with the PostgreSQL 17 and Mailpit Compose containers healthy. The original volume was preserved. The following checks were run after Phase 5 implementation:

| Command                                                           | Observed result                                                                                                                                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                                       | Exit 0, no ESLint warnings                                                                                                                                                              |
| `pnpm typecheck`                                                  | 16/16 Turbo tasks passed                                                                                                                                                                |
| `pnpm test`                                                       | 10/10 Turbo tasks; financial engine 55/55 tests; API 115 passed and 4 existing skips; app 122/122 tests; network tests passed                                                           |
| `pnpm build`                                                      | 9/9 Turbo tasks passed; API compiled and Expo web exported                                                                                                                              |
| `FINORA_REMINDER_EMAIL_ENABLED=true` with targeted Playwright E2E | Chromium web 6/6 passed, including in-app reminder, partial correction/audit, owner isolation, preparation exact result, Fin monitoring, planned-loan confirmation and Mailpit delivery |

The first complete `pnpm build` attempt failed during Expo asset persistence after bundling. A direct `pnpm --filter @finora/app build` retry exited 0, and a subsequent complete `pnpm build` exited 0. The optional email E2E uses one synthetic verified account and local Mailpit. One generic message was observed despite multiple notices on the same day, and exactly one database item reached `emailStatus: sent`; no external email delivery service or push provider was tested.

Visual QA used Chromium at 390 px mobile web for the Vietnamese notification center and preparation form, plus an English/dark notification pass. The layout, bottom dock selection, button focus, Vietnamese text and recovery from missing inputs were checked. Native iOS and Android were not run; native safe area, font and push behavior need device UAT.

## Limits and deployment work

- The 90-day daily preparation model cannot plan a due date beyond its horizon. It uses user estimates and excludes unknown lender fees, penalties, variable rates and lender payment reconciliation.
- Outstanding principal is schedule based. Partial payment allocation between principal, interest and fees cannot be known from a manual total alone.
- Profile changes invalidate a saved preparation; the user must re-enter current cash facts before a new shortfall assessment. The app does not infer an automatic credit-risk score or default probability.
- Email send status means SMTP accepted the message. A crash between acceptance and the database update can cause a retry, so exactly-once email delivery is not guaranteed. The in-process sweep runs only while the API is available; production needs a continuously running scheduler/worker and SMTP monitoring.
- Push delivery, native-device verification, accessibility assistive-technology testing and owner UAT remain open.
