# Financial Digital Twin · Phase 3

## Scope and source of truth

The projection is a deterministic scenario model, not a lender forecast or lending decision. `packages/financial-engine/src/digital-twin.ts` calls the existing `simulate()` schedule for baseline and for hypothetical reamortization. The existing interest, rounding, balance and UTC due-date calculation remain in `packages/financial-engine/src/index.ts`; no separate loan formula is introduced.

The request and response schemas live in `packages/contracts/src/digital-twin.ts`. The API is guarded by Better Auth `SessionGuard`. `POST /api/digital-twin/compare` accepts a user-entered loan and budget. `POST /api/simulations/:id/digital-twin` obtains the loan only from a `LoanSimulation` row whose `userId` matches the session. Both endpoints validate strictly and return the same `TwinComparison` structure. User-supplied `observed` provenance is downgraded to `user_estimate`; this endpoint has no bank evidence to certify an observation. The pure engine can represent `observed` for future verified integrations.

The screen is reached from a saved simulation at `/twin/[id]` and uses the owned endpoint. It does not change or save the loan. The existing profile supplies income and debt as editable estimates; its `expenses` column is an unsplit total, so the user must enter essential and discretionary portions. Unknown values remain `null`. The UI never turns a blank field into zero.

## Monthly recurrence

For month `t`, the engine starts with the stated financial state. Active recurring events alter income, essential spending, discretionary spending or existing debt only within their configured interval. Scenario shocks then apply. Monetary changes use Decimal.js and round to whole VND. Every monthly amount is range checked. The new loan payment and balance come from the verified schedule.

```text
net cash flow[t] = income[t] − essential[t] − discretionary[t]
                   − existing debt[t] − new loan payment[t]
savings[t]       = savings[t−1] + net cash flow[t]
DTI[t]           = (existing debt[t] + new loan payment[t]) / income[t]
```

DTI is unknown when income is zero. Savings is unknown when the opening balance is missing. Emergency coverage uses the known, remaining earmarked reserve divided by essential expenses, existing debt and the new payment; it remains unknown if savings, reserve or the denominator is unavailable. The first negative monthly net flow, stressed period count, reserve depletion and recovery month are derived from the same monthly rows shown by the UI.

Default **illustrative** thresholds are 50% DTI and three months of emergency cover; callers may provide validated thresholds. `unsustainable` means projected savings become negative, `pressured` means monthly shortfall, DTI pressure or reserve pressure without a negative savings balance, and `insufficient_data` means key evidence is unavailable. These are transparent product rules, not calibrated credit risk or lender approval criteria. A zero emergency fund does not count as a reserve that was depleted; it does count as below the illustrative reserve threshold.

## Scenarios and unknown costs

Scenarios combine income reduction, temporary unemployment, one-off expense, bounded expense inflation, additional monthly debt, alternative loan amount/term and early principal payment. Each shock has validated month, duration and severity. A start beyond the loan term is rejected. The baseline always uses the original loan and state, independent of the alternative.

Early principal payment is capped at outstanding principal and recalculates the remaining schedule through `simulate()` for the remaining principal and term. The due dates stay aligned with the original schedule. This is always labeled hypothetical because lender reamortization, accrued interim interest and penalty rules are unverified. An unknown origination or early repayment fee remains in `unknownCosts`; `totalKnownLoanPayments` includes only supplied fees and known installments.

## Fin AI and privacy

`projectFinancialTwin` is a strict no-argument, read-only AI tool selection. The server interprets numeric assumptions, retrieves only the current user's profile and attached saved simulation, runs `compareDigitalTwin`, and stores a compact structured summary with the user-owned `IntelligenceTurn`. The provider receives neither the profile nor the schedule/tool result. External inference remains opt-in per request; local analysis is the default. Fin asks for the expense split, loan terms or duration when needed. A saved split in an earlier authorized Digital Twin block can be reused in a later turn. The model's wording does not set financial scores or arithmetic.

## Verified synthetic example

Run `node scripts/verify-digital-twin.mjs` after building contracts and the financial engine. With VND 24,000,000, 12% nominal annual annuity, 12 months, first due 2026-01-31, the first payment is VND 2,132,371 and the final balance is zero. With three months of unemployment from month 2 plus VND 4,000,000 unexpected expense in month 2, first negative cash flow and reserve depletion occur in month 2; three periods are stressed. The origination fee remains unknown. The script asserts that all baseline dates, installments and balances match `simulate()` exactly and that repeated runs are identical.

## Boundaries

- No database migration is required for a stateless comparison. A Fin conversation summary is persisted in the existing owner-scoped intelligence table; the interactive form itself is not autosaved.
- Future income, tax, variable rates, lender approval, and actual payoff rules are outside the model unless entered as explicit assumptions. Recurring events are supported by the engine/API; the initial screen offers the named scenario controls.
- Web Chrome at desktop, 390 px phone viewport and dark mode has been reviewed. iOS/Android runtime, screen reader and owner UAT remain separate release gates.
