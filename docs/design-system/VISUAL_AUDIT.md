# Visual audit · FINORA Product Experience 2.0

Baseline: upstream `main` at `4525f41`, including the existing draggable glass
navigation, tested in a separate Git worktree. The application uses Expo Router
for shared public and signed-in routes, shared UI/tokens, Geist and the two serif
faces, cookie/SecureStore sessions via Better Auth, and a real persisted financial
profile and simulation ledger. The deterministic calculations and user-owned
API data are not design placeholders.

## What needed to change

| Screen         | Baseline issue                                                                                               | Target in this release                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Welcome        | Three similarly weighted promises competed with the primary action.                                          | An editorial introduction and a short confidence-building sequence.                                             |
| Auth           | Separate registration and sign-in required an early decision; conventional fields dominated the composition. | A single email-first OTP flow, with an explicit secondary password route for existing accounts.                 |
| Home           | Readiness, shortcuts and saved rows were too similar in weight; the empty state resembled a missing metric.  | A clear monthly planning figure or an honest first action, followed by simple ledger rows.                      |
| Explore        | Every synthetic offer was an equivalent card; comparison required memorizing entries.                        | A scannable catalog, attributed terms and a side-by-side comparison with unknown values preserved.              |
| Simulator      | Inputs formed a long block and the result column disappeared before computation.                             | An independent result panel and a useful mobile order, with cost breakdown, scenario baseline and schedule.     |
| Assistant      | Context, answer and composition competed; the composer followed the feed.                                    | A focused conversation surface with persistent composer, explicit context and attributed deterministic figures. |
| Loans          | One bordered card per saved item; actual obligations were easy to confuse with plans.                        | Separate scheduled obligations and an understated saved simulation ledger.                                      |
| Profile        | Similar cards for unrelated settings; implications of financial fields were tucked away.                     | Purposeful sections, privacy explanation, identity controls and persisted appearance/language.                  |
| Saved schedule | Amounts were accessible but repeated boxed treatments did not prioritize the actual repayment reading order. | High-contrast first payment, labeled principal and interest, then individually readable installments.           |

Evidence and known gaps are recorded in [verification](../VERIFICATION.md).
Synthetic loan and account data in the QA captures is disposable local data.

## Rendered evidence

- Before: [390px](screenshots/before/overview-390.webp) · [768px](screenshots/before/overview-768.webp) · [1440px](screenshots/before/overview-1440.webp).
- After: [360px](screenshots/after/overview-360.webp) · [390px](screenshots/after/overview-390.webp) · [430px](screenshots/after/overview-430.webp) · [768px](screenshots/after/overview-768.webp) · [1024px](screenshots/after/overview-1024.webp) · [1440px](screenshots/after/overview-1440.webp) · [1920px](screenshots/after/overview-1920.webp).
- [Auth iterations](AUTH_VISUAL_QA.md), [assistant iterations](ASSISTANT_ITERATIONS.md) and [Home and simulator iterations](PRODUCT_ITERATIONS.md).

The screenshots are rendered Expo web views backed by a local API and PostgreSQL, not design mocks. At mobile widths the simulator capture shows the resulting summary after pressing Calculate; the saved-schedule screen shows how the same result reads on revisit.
