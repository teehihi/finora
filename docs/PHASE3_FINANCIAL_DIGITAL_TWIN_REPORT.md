# FINORA · Phase 3 completion report

Date: 2026-11-28 (Asia/Bangkok). Branch: `codex/phase3-financial-twin`.

## Delivered

- Extended the existing Financial Calculation Engine with full-term monthly Digital Twin projections and deterministic scenario comparison. Baseline installments, balances and due dates use `simulate()` exactly. Decimal.js handles money and monthly rounding.
- Added a strict state/scenario/result contract with explicit provenance, nullable unknowns, user-entered zero, recurring events, configurable resilience thresholds, shortfall/reserve/recovery markers and unknown-cost flags.
- Added owner-guarded API routes for direct assumptions and saved simulations. A user cannot use another account's simulation ID. User assertions of `observed` are classified as `user_estimate` at the API boundary.
- Added a read-only, no-argument Fin AI tool selection. The server runs the projection; the external provider never receives saved profile, conversation history, documents or calculation results. Fin asks for an expense split or loan terms instead of treating missing information as zero.
- Added a saved-plan entry point and responsive Vietnamese/English interactive screen with scenario controls, three comparisons from the same API result, month-by-month breakdown, loading/retry, fee warnings and illustrative threshold labels. Reviewed web desktop, 390 px phone viewport and dark mode.
- Documented design, formulas, privacy boundaries, early-repayment assumptions and a synthetic verification script.

## Phase 3 files

| Area                | Files                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contracts           | `packages/contracts/src/digital-twin.ts`; `core.ts`, `index.ts`, `intelligence.ts`                                                                                                                                                    |
| Engine              | `packages/financial-engine/src/digital-twin.ts`, `index.ts`; `test/digital-twin.test.ts`                                                                                                                                              |
| API / Fin           | `apps/api/src/modules/planning.ts`, `intelligence-twin.ts`, `intelligence.ts`, `intelligence-rules.ts`; `test/intelligence-twin.test.ts`                                                                                              |
| Client / UI         | `packages/api-client/src/index.ts`; `packages/i18n/src/digital-twin.ts`, `index.ts`; `apps/app/src/features/financial-twin.tsx`, `intelligence/blocks.tsx`; `apps/app/app/(workspace)/twin/[id].tsx`, `saved/[id].tsx`, `_layout.tsx` |
| Verification / docs | `tests/e2e/financial-twin.spec.ts`, `tests/e2e/intelligence-backend.spec.ts`, `scripts/verify-digital-twin.mjs`, `docs/architecture/FINANCIAL_DIGITAL_TWIN.md`, `docs/product-design/PHASE3_DIGITAL_TWIN_WIREFRAME.md`                |

The branch also contains the previously uncommitted Phase 1/2 implementation and reports. Those earlier changes are required for this checkout to build; no production data or database reset was used.

## Verification

Node `v22.20.0` was used. The `pnpm` shim could not self-install its pinned version in the sandboxed Windows user home (`EPERM`), so installed Node binaries ran the equivalent build, lint, typecheck and test commands directly.

| Check                                                         | Observed result                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node ..\..\node_modules\typescript\bin\tsc -p tsconfig.json` | Contracts, financial engine, i18n, API client and API built.                                                                                                                                                                                                                        |
| App/API TypeScript `tsc --noEmit`                             | Passed.                                                                                                                                                                                                                                                                             |
| Financial engine `vitest run`                                 | 52/52 passed, including 10 Digital Twin cases.                                                                                                                                                                                                                                      |
| API `jest --runInBand`                                        | 94/94 passed, including Fin AI split, multi-turn state, word-number duration and early payment.                                                                                                                                                                                     |
| App `jest --runInBand`                                        | 118/118 passed.                                                                                                                                                                                                                                                                     |
| `eslint . --max-warnings=0`                                   | Passed after changes.                                                                                                                                                                                                                                                               |
| Expo web export                                               | Passed; 5,758 modules bundled.                                                                                                                                                                                                                                                      |
| Chrome E2E                                                    | 11/11 relevant cases passed in one final run: Digital Twin owner scope, exact schedule reconciliation, deterministic replay, Fin AI, missing fees, saved entry, and existing loan/cashflow/Intelligence/ownership flows. Separate visual run reviewed desktop, phone and dark mode. |
| `node scripts/verify-digital-twin.mjs`                        | Passed; first annuity payment VND 2,132,371, final balance zero, first stressed shortfall month 2, three stressed months, reserve depletion month 2, unknown origination fee.                                                                                                       |

An earlier E2E run exposed two existing Intelligence assertions that required `meta` to be the first SSE packet; progress packets legitimately precede it. The tests now locate the `meta` packet by type. A Digital Twin test locator also selected a hidden “open” button instead of the visible heading; it was corrected. The subsequent full 11-case run passed. No application behavior was changed for these locator/assertion fixes.

One app Jest run executed concurrently with API Jest timed out in the existing `read-state` test. The test passed in isolation, and a subsequent solo full app run passed 118/118.

Repository-wide `prettier --check .` reports many pre-existing formatting differences outside this phase; changed Phase 3 files were formatted and checked separately. `git diff --check` passed (Windows line-ending notices only).

## Limitations and next steps

- This is a scenario model, not a guaranteed forecast, lender quote, approval model or trained credit score. The 50% DTI and three-month reserve thresholds are configurable initial assumptions and have not been calibrated to outcomes.
- Actual lender variable rates, additional fees, early repayment rules and interim interest are not inferred. Partial early repayment is hypothetical; missing fees remain unknown.
- The saved profile has one combined `expenses` field. The screen requires the user to split it into essential and discretionary spending. The initial UI does not edit recurring events, although the validated engine/API support them.
- Interactive scenario input is stateless; only a compact Fin conversation summary is stored under the user account. A dedicated persistent Digital Twin plan and source-backed observed transactions would require a separate product decision and migration.
- Visual QA was Chrome web at desktop/390 px/dark. iOS/Android runtime, screen-reader checks and owner UAT remain open. No production account, loan document, OTP or database was used. No push or merge was performed.
