# Phase 1 conversation repair · 28 November 2026

## Scope and root causes

This repair addresses the six-turn Vietnamese UAT transcript supplied by the owner.
It keeps the existing Better Auth session, owner-scoped analysis history, provider
adapters, deterministic financial engine, catalog and Finora design system.

| Finding                          | Cause                                                                                                                                      | Repair                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Every turn showed local mode     | External processing requires consent per request; the account had not enabled it. The privacy control was hard to discover.                | A configured provider now exposes a chat header action opening the existing consent control. Local, live and provider-fallback badges are distinct. No external request was made in this repair. |
| Vietnamese facts were missed     | The local parser did not accept several ordinary word orders, qualifiers, `củ` or a reversed savings expression.                           | Parse and normalize the supplied budget and reserve phrases, keeping approximate, stated and explicitly confirmed amounts distinct.                                                              |
| Follow-ups lost facts            | Continuation detection and the saved intent omitted current savings, minimum reserve and preferred repayment.                              | Merge those fields into the existing versioned conversation context and use them on later turns.                                                                                                 |
| Known fields were asked again    | Missing-field selection did not consistently use the merged conversation state and asked for rate and calculation method during discovery. | Ask at most two relevant unknowns; defer rate and method to explicit schedule requests. An explicit zero debt stays known.                                                                       |
| Responses repeated generic text  | The local answer ignored newly supplied values and summary requests.                                                                       | Acknowledge new values and summarize the retained, user-provided amounts. Calculations remain in the deterministic engine.                                                                       |
| Catalog cards appeared too early | A new borrowing amount triggered the public catalog before a budget was known.                                                             | Delay unsolicited catalog cards until a basic budget is complete; loan matching also requires that profile. Explicit catalog search remains available.                                           |
| Chat was too wide                | Answers and analysis blocks inherited the full workspace width.                                                                            | Bound bubbles, answer surfaces and cards while keeping the existing branding and layout.                                                                                                         |

Development traces now log selected read-only tool names and result block kinds;
they do not log prompts, profile amounts or provider credentials. A provider error
log records a coarse category, HTTP status and stage. The context change uses the
existing JSON envelope and needs no database migration.

## Changed files

- `apps/api/src/modules/intelligence-rules.ts`, `intelligence-context.ts`,
  `intelligence.ts`: parsing, typed context, question policy, local answer,
  catalog gate, fallback state and safe traces.
- `packages/contracts/src/intelligence.ts`, `packages/i18n/src/index.ts`:
  fallback provider contract and Vietnamese/English labels.
- `apps/app/src/features/intelligence/workspace.tsx`: consent entry point,
  provider badge and bounded chat widths.
- `apps/api/test/intelligence-rules.test.ts`, `intelligence-context.test.ts`,
  `tests/e2e/intelligence-conversation-repair.spec.ts`,
  `intelligence-consent.spec.ts`, `intelligence-workspace.spec.ts`: regression
  coverage with synthetic data.
- `docs/architecture/INTELLIGENCE.md` and this report: current behavior and
  verification limits.

## Verification

The changed parser and context tests passed (39 tests). `pnpm lint`,
`pnpm typecheck` (16 tasks), and `pnpm test` passed: financial engine 56 tests,
API 128 tests with 4 skipped, app 122 tests. The API and app suites are local
unit tests; they do not prove live provider behavior.

| Command                                                                                                                                    | Result                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm build`                                                                                                                               | 9/9 tasks passed outside the sandbox. The first two sandboxed attempts failed with Windows `EPERM` while Expo wrote `apps/app/dist/_expo/static`; API and other package builds had passed. |
| `pnpm exec playwright test` with 12 local AI, finance, document, repayment and ownership spec files, excluding `intelligence-live.spec.ts` | 17 passed, 2 skipped in 2.1 minutes. The skipped cases require `DOCUMENT_OCR_LANGS` and `FINORA_REMINDER_EMAIL_ENABLED=true` respectively.                                                 |
| `pnpm exec prettier --check` on changed files; `git diff --check`                                                                          | Passed.                                                                                                                                                                                    |

The six-turn E2E uses a synthetic account and explicitly sets
`externalConsent: false`. It checks that earlier facts survive, catalog cards
do not appear prematurely, known values are not requested again, the summary
includes the stated figures, and desktop/mobile web layouts have bounded width.
Web screenshots were inspected at 1720 px and 390 px in light and dark mode.
No native device was run, so safe areas and native focus behavior still need
owner UAT. Browser E2E and web builds required running outside this session's
sandbox because local sockets and Expo's generated asset directory were blocked
there. No production database or real document was used; the existing local
PostgreSQL volume was preserved.

## Remaining limits and next step

- **Live Claude inference: BLOCKED.** The owner confirmed the current Claude
  token has not been rotated. No live inference, Messages API, native tool call,
  streaming or live health check was run in this repair. Rotate the exposed token
  outside Git, update the server-only environment, then run the existing
  synthetic live smoke test and the opt-in live E2E. Do not paste the token into
  chat, logs, screenshots or a commit.
- The local parser recognizes the tested Vietnamese patterns, not unrestricted
  language. It cannot independently verify user-stated income, expenses or
  savings. Ambiguous documents and lender-specific terms remain governed by
  the document review and catalog source flows.
- External providers receive only the redacted current prompt after explicit
  consent. The current privacy boundary intentionally prevents the model from
  seeing saved profile, full conversation history or uploaded documents; typed
  local context and engine blocks provide continuity in the product.
