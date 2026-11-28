# FINORA AI Core Repair

## Root causes

| Bug                             | Confirmed cause                                                                                                                                                                                                     | Repair                                                                                                                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-001, provider reverted      | The composer reset external consent on submit. The API had no requested-provider field or durable preference.                                                                                                       | The composer stores the selected provider by account and conversation. The server stores requested/effective provider, configured model, consent for the completed turn and fallback reason. The explicitly labeled Send to Claude/OpenAI action authorizes the outgoing question. |
| BUG-002, lost context           | The backend called the external model before retrieving the budget or transcript. The local continuation heuristic only retained context on a subset of intents and could lose the last snapshot beyond eight rows. | Assemble an owner-scoped snapshot before provider routing. Carry forward the structured state after each turn, and retain a bounded window of 50 applicable messages. Preserve current budget fields when starting a new loan estimate.                                            |
| BUG-003, generic recall         | Recall had no route. The borrowing and schedule keywords sent a recall question into the normal consultation path.                                                                                                  | Route recall before affordability, catalog and simulation. Answer from the snapshot or search the available historical statements if explicitly requested. “Đổi thu nhập thành…” updates one field.                                                                                |
| BUG-004, safety false positives | The old validator rejected every digit and isolated terms such as “lãi” and “phí”. Rejection triggered a second external request for a generic acknowledgement and showed an internal safety message.               | Allow neutral explanations and compare complete claims against server-rendered evidence. On rejection use the deterministic response for the current intent and log a rule code.                                                                                                   |
| BUG-005, irrelevant follow-ups  | Vague borrowing signals and model-selected tools could trigger budget questions. The limited follow-up heuristic also missed explicit summaries and corrections.                                                    | Recall exits without analysis cards. Summaries, general definitions and explicit budget corrections do not solicit unrelated borrowing inputs. Offer external tools according to the current question.                                                                             |

## Request flow and compatibility

Before: submit and reset consent → optionally send the current redacted prompt to the server-configured provider → acknowledge proposed tools → load a short user-wide history → infer continuation → generate cards and optionally show a safety warning.

After: choose provider → send with request-specific consent → authenticate → verify attachment ownership → load account and conversation data → interpret the current request → resolve provider → execute authorized deterministic analysis → send validated native tool results when requested → render safe wording or use grounded local text → stream and persist the turn.

- The nullable conversation ID preserves the existing default conversation and enables scoped reopen through `/assistant?conversationId=<uuid>`. Reads, writes and deletes constrain both user and conversation. Attached simulations keep separate loan assumptions. The existing version 2 envelope stores the latest typed context, pending fields carried by missing-input blocks, tool results, and routing. The ordered transcript retains earlier statements and corrections within the bounded window. Older array and version 2 rows remain readable.
- The selected provider and per-turn consent are separate. Absent consent, the server processes locally, even if the preferred provider is Claude. A network or provider failure affects the requested turn only. The browser remembers its selection and can restore a saved server selection on a new client. It does not persist consent for future requests.
- The provider receives a filtered current prompt and an intent label. Recall, summary and attached document requests send a task label in place of the user's question. The model never receives stored profile values, previous messages, extracted document evidence, private IDs or numerical tool outputs. Native results indicate whether a verified result was produced. Calculations and citations are rendered on the Finora server.
- Evidence categories cover user statements, confirmed profile, verified tool and catalog results, document evidence and explicit simulation. Unknown and unsupported values cannot ground a claim. Exact sentence matching binds wording, value and units. An explicit simulation requires an assumption marker. Catalog rates and document terms still come from typed blocks and source evidence.

## Changed files

- API routing, persistence and recall: `apps/api/src/modules/intelligence.ts`, `intelligence-context.ts`, `intelligence-recall.ts`, `intelligence-rules.ts`, `intelligence-twin.ts`.
- Provider adapters and safety: `apps/api/src/modules/intelligence-provider.ts`, `intelligence-anthropic.ts`, `intelligence-narrative.ts`.
- Contracts, database and UI: `packages/contracts/src/intelligence.ts`, `packages/database/prisma/schema.prisma`, migration `202611280003_intelligence_conversation_scope`, `apps/app/src/features/intelligence/{workspace.tsx,transport.ts}`, `packages/i18n/src/index.ts`.
- Regression: API context and narrative tests, `tests/e2e/intelligence-provider-memory.spec.ts`, and existing backend, consent and live specs.

## Conversation regression

The test asserts the persisted database row after each submitted turn. Monetary fields below are in VND. In Local mode the requested and effective providers were Local on every turn. Reload is a read, so it produces no provider request.

| Turn | User intent and outcome                                                        | Stored loan and purpose       | Income / expenses / existing debt per month |
| ---- | ------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------- |
| 1    | Start a loan consultation                                                      | 20,000,000 for vehicle repair | Unknown / unknown / unknown                 |
| 2    | Provide income                                                                 | 20,000,000 for vehicle repair | 12,000,000 / unknown / unknown              |
| 3    | Provide expenses and debt                                                      | 20,000,000 for vehicle repair | 12,000,000 / 7,000,000 / 500,000            |
| 4    | Recall loan amount. Answer returned 20,000,000 for vehicle repair              | 20,000,000 for vehicle repair | 12,000,000 / 7,000,000 / 500,000            |
| 5    | Recall monthly income. Answer returned 12,000,000                              | 20,000,000 for vehicle repair | 12,000,000 / 7,000,000 / 500,000            |
| 6    | Correct income. Unrelated fields were preserved                                | 20,000,000 for vehicle repair | 14,000,000 / 7,000,000 / 500,000            |
| 7    | Summarize accumulated values                                                   | 20,000,000 for vehicle repair | 14,000,000 / 7,000,000 / 500,000            |
| 8    | Reload and reopen the same conversation                                        | 20,000,000 for vehicle repair | 14,000,000 / 7,000,000 / 500,000            |
| 9    | Recall original income. Answer returned 12,000,000 and retained the correction | 20,000,000 for vehicle repair | 14,000,000 / 7,000,000 / 500,000            |

Turns 4, 5 and 9 produced no analysis blocks. Turn 6 returned affordability without missing-information cards. At turn 3 the local engine returned 4,500,000 monthly cash flow. The separate six-turn regression verified the term, preferred payment, savings and reserve fields, as well as remaining cash of 2,500,000 and approximately 20.83% debt to income after an explicitly assumed 2,000,000 monthly payment. A different conversation under the same account could not recall the loan. A second account received no history for the first account's conversation ID, and an injected cross-user request stayed local without accessing the other state.

## Safety evidence

Jest verifies that grounded 20,000,000 VND is accepted with its complete wording, the modified amount is rejected, the verified cash flow is accepted, and the same number in a fabricated fee is rejected. An explicitly assumed payment is accepted with its assumption marker. An unmarked simulation or an unknown evidence source is rejected. Unsupported interest rates, fees, approval promises and links remain rejected. A live reply triggered the sanitized `format` rule while the server still returned the relevant structured result.

## Live Anthropic and SSE

The configured gateway at `zplay.io.vn` returned live completions for `claude-sonnet-5`. The provider-switching sequence recorded Claude → Claude for turns 1–4, 7 and 9, and Local → Local for turns 5–6. After turn 7 the browser reloaded the named conversation and restored the Claude selection. The separate ten-turn streak recorded requested Claude, effective Claude and no fallback on all ten requests. Omitting consent on the following request kept Claude selected and processed the recall locally.

The streak included a real native `simulateLoan` call. The backend log recorded one accepted selection and one actual result, with 6,392 ms spent in the provider round trip. The returned schedule matched Financial Engine for 20,000,000 VND over 12 months at the explicitly assumed 12% annual rate. The first payment was 1,776,976 VND and principal plus interest was 21,323,708 VND. Total including fees remained unknown. The failure test injected one HTTP 503 from a loopback gateway. The result was requested Claude → effective Local, reason `provider_error`. The next request against the actual configured gateway reused the same persisted conversation, recovered to Claude without respecifying a provider, and recalled 20,000,000 VND.

The measured SSE run delivered its first progress data in 41 ms, completed in 3,711 ms, and returned 13 answer deltas across 15 reads. SSE separates progress from the verified answer. Upstream Anthropic requests currently complete before verified answer chunks are emitted.

## Commands and measured results

| Command                                                                                                                                                  | Result                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:generate` and `pnpm db:migrate`                                                                                                                 | Prisma Client generated. The conversation scope migration applied to localhost PostgreSQL.                                                                                                    |
| `pnpm lint`, `pnpm typecheck`, `pnpm build`                                                                                                              | Passed. Typecheck 16/16 tasks and build 9/9 tasks, including the Expo Web export.                                                                                                             |
| `pnpm test`                                                                                                                                              | Passed. 56 financial engine tests, 135 API Jest tests with 4 skipped, 121 app Jest tests, and 7 network and auth script tests.                                                                |
| `$env:FINORA_LIVE_AI_TEST='1'; pnpm exec playwright test tests/e2e/intelligence-provider-memory.spec.ts tests/e2e/intelligence-post-repair-live.spec.ts` | 6 passed in 3.4 minutes. Includes the Local replay, switch and reload with real Claude, ten-turn streak, injected failure and live recovery, six-turn financial consultation, and SSE timing. |

## Phase 2–6 regression

The selected Phase 2–6 Playwright regression covered `intelligence-{backend,consent,conversation-repair,profile-update,workspace,document}.spec.ts`, `loan-matching.spec.ts`, `financial-twin.spec.ts`, `document-intelligence.spec.ts`, `proactive-repayment.spec.ts` and `phase6-evaluation.spec.ts`. The initial run finished with 14 passed, 2 skipped and 1 failure. Case X04 expected a privacy notice on a refused cross-user request. The API now returns that notice, and the final targeted rerun passed all 3 tests. Phase 6 scored 8/8 across Local and Claude. In both modes X04 stayed local and returned only the privacy notice. Its three eligible external cases used Claude.

```powershell
$env:FINORA_LIVE_AI_TEST='1'
pnpm exec playwright test tests/e2e/phase6-evaluation.spec.ts tests/e2e/intelligence-provider-memory.spec.ts --grep 'phase 6|historical recall' --reporter=line --output=test-results/ai-core-final-regression
```

## Scope and remaining limits

- Browser evidence covers desktop and 390px mobile web, Vietnamese text, dark mode and reload. Native iOS and Android were not run.
- OpenAI remains supported by the adapter and its mocked tests. This environment had no OpenAI credential for a live check.
- Vietnamese scan OCR and reminder email delivery tests were skipped because the local run lacked their opt-in configuration. Document review and in-app notification tests passed.
- Original-value recall works within the last 50 relevant stored turns. The current snapshot is carried forward. Attached saved simulations keep their assumptions scoped to the selected simulation.
- The conversation API serializes active turns in the running NestJS process. Coordinating simultaneous writes across multiple API replicas was outside this verification.
