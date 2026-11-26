# 01 · Product discovery

**Baseline:** FINORA Signature V5, local `fe71a710cbd7b95a7fccf5d5fcf2b44802666610` (application verified at `a669065`). [PR #15](https://github.com/teehihi/finora/pull/15) is the corresponding V5 publication, not this sprint's review branch.

## Objective and activity

Reconfirm who needs FINORA and select one borrowing decision to organize the demo around. Reviewed the existing [vision](../product/PRODUCT_VISION.md), [V5 evidence](../VISUAL_EXCELLENCE_REPORT.md), [prior product gap audit](../PRODUCT_GAP_AUDIT.md), current route code and baseline browser evidence. The eight gates in the brief are the working process, adapted from [HomeNest's app process](https://homenest.com.vn/quy-trinh-thiet-ke-app-tu-a-z), not a claim that the source has those exact eight headings.

## Problem, promise and primary path

Vietnamese borrowers may see an attractive advertised rate without knowing whether the cost assumptions, one-time fees or monthly burden fit their own budget. Moving among advertising, calculators, contract notes and reminders also makes it easy to treat a guess as a real obligation. FINORA connects these decisions without selling or approving credit.

**Positioning:** A Vietnamese-first borrowing decision and repayment companion. Before borrowing, understand the first payment, total known cost, unknown fees and room in your budget. After signing, deliberately start tracking the real loan; FINORA records user-confirmed payment status, not payment execution or bank settlement.

**Primary demo journey:** From the public tour, understand what FINORA does; optionally sign in, find a sample offer, compare on a common amount and term, supply personal terms, see known and missing costs and save an estimate. Fin can guide users along the same path, but its explanation must be grounded in deterministic tools and named assumptions. A confirmed contractual obligation is another deliberate flow (not a required last step for every borrower).

## Segments and jobs to be done

| Segment                                                 | Job to be done                                                                  | Likely friction to validate                                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| First-time borrower (including eligible adult students) | Know where to start and whether not borrowing is the better choice.             | Income may be irregular; APR/lãi suất and phí are easily conflated; unfamiliar with document terms. Product never assesses eligibility. |
| Young salaried employee                                 | Compare what the same borrowing amount costs and what remains after essentials. | Skims on a phone; expects concise monthly/total figures and does not want to re-enter existing data.                                    |
| Freelancer                                              | See the effect of a weaker month without changing the real financial profile.   | Income varies; average income alone may conceal weak months.                                                                            |
| Existing borrower                                       | Know which installment is next, then mark it paid deliberately.                 | Manual tracking may be mistaken for bank synchronization; recorded amounts and dates may differ from actual bank records.               |

## Trust, accessibility and abandonment risks

- Do not ask for a contract or complete profile before showing public value. Explain purpose and visibility before optional financial fields or file upload.
- Show monthly versus annual basis, known versus missing fees, and estimate versus tracked loan in copy as well as visually. A badge or color alone is insufficient.
- Prioritize scannable Vietnamese amounts, large action targets, keyboard focus, reduced motion, large text and fallback access on small phones. Abrupt OTP/session failure, unknown-input dead ends, overloaded choices and distrust of uploading a real contract are hypotheses, not measured reasons for abandonment.
- State why a number appears; distinguish local assistance, financial-engine results and optional external interpretation. Do not imply approval or recommend a specific lender as suitable without sufficient data.

## Alternative workflows and differentiation

Prior [reference review](../design-system/PRODUCT_EXCELLENCE_REFERENCES.md) and [Signature audit](../design-system/FINORA_SIGNATURE.md) are interface observations, not user research or fresh competitor benchmarking.

| Alternative               | Strength to learn from                         | FINORA's distinct job                                                                                 |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Typical bank app / wallet | Branded trust, concise actions and activity.   | Cross-offer education and stress-testing independent of disbursement or payments.                     |
| Loan comparison site      | Rapid product scan and meaningful filters.     | Carry one standardized comparison into personal assumptions and distinguish sample terms from quotes. |
| Standalone calculator     | Fast deterministic feedback.                   | Link calculation to optional budget, save reviewed assumptions, and keep a traceable schedule.        |
| General AI assistant      | Approachable entry and question clarification. | Named local tools, verified numeric output, no autonomous writes or lender approval.                  |
| Personal finance tracker  | Upcoming tasks and a historical ledger.        | Integrate the pre-loan decision without silently turning a saved plan into actual debt.               |

## Goals, non-goals and measurement plan

Goals: give useful value before sign-in, make cost and uncertainty legible, preserve privacy boundaries, and make it clear when the user is planning versus tracking. Non-goals: lender approval, disbursement, payment/transfer, bank synchronization, wallet balance, investment, insurance marketplace or guarantees about affordability. No production analytics in this sprint.

| Proposed indicator            | How to verify in local moderated UAT                                                                                         | Initial gate, not a result                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Cost comprehension            | Ask tester to point to first payment, total known, unknown fees, and term source.                                            | 4/4 interpreted correctly before labeling flow acceptable.                                  |
| Financial state comprehension | Ask whether saving the estimate creates debt, and which action begins tracking.                                              | Correct explanation in every observed task attempt; mandatory if wrong.                     |
| Primary journey completion    | Observe public tour → comparable options → own terms → saved estimate. Record success, retries, backtracks, time and device. | Demonstrator completes without hidden admin steps; seek owner review and later user trials. |
| OTP and input recovery        | Inject unavailable service or validation error; observe whether previously entered email or viable terms remain.             | No loss of valid input in the specified recovery paths.                                     |
| Accessibility                 | Keyboard and visual checks on browser; VoiceOver/TalkBack and large text on native device when available.                    | No blocked primary action; device findings listed separately.                               |

**Gate:** Core job, boundary and one primary journey are explicitly defined for internal planning. **Limitations:** No interviews, behavioral analytics, usability sample or measured results were gathered for discovery. Segment anxieties, setting priorities and metrics are hypotheses pending actual owner/user sessions; demo readiness is not a production or contest eligibility judgment.
