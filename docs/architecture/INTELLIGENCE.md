# Finora Intelligence 3.0

Finora AI opens a structured conversation that connects to the public catalog, private
document review, saved simulations and manually tracked repayments. Older
text-only conversations are still accessible.
Finora does not approve loans, apply on the user's behalf, or initiate payments.

## Local setup and demo

1. Use Node 22 and the workspace pnpm version. Start Docker, then run
   `pnpm install --frozen-lockfile`, `pnpm run setup`, and `pnpm dev`. Apply
   migrations to your existing database; do not reset it.
2. Sign in with Mailpit OTP. In Hồ sơ set monthly income to 15,000,000 ₫, living
   costs to 8,000,000 ₫ and existing debt payments to 1,000,000 ₫.
3. Open Finora AI. Try:
   **“Vay 50 triệu tiêu dùng, lãi 12%/năm trả góp đều trong 12 và 24 tháng. Thu nhập giảm 20% thì sao?”**
   The result separates the 35% planning capacity, public products with official
   sources, and two deterministic schedules using the supplied assumptions.
   Unknown fee leaves total including fees unknown. Nothing is saved until confirmed.
4. Ask **“Nếu vay trong 36 tháng thì sao?”** to continue the private conversation;
   follow-up preserves the previous assumptions, unless the user supplied replacements.
5. In Hồ sơ khoản vay, load the **synthetic document** or choose a locally generated
   PDF. Review page evidence, correct assumptions, leave fees unknown if omitted,
   and then explicitly calculate and save. Reopen the resulting schedule.
6. Optionally confirm that a schedule corresponds to an actual debt you want to
   track. In Khoản vay / Sổ trả nợ, mark payments yourself. Finora never synchronizes
   or verifies bank transfers.

## How results are produced

- The server derives identity from the Better Auth session. All history, documents,
  schedule snapshots and manually tracked repayments are fetched by owner. Saving
  a scenario, using document fields, deleting a document, and marking a payment
  require a user action; external model tools have no write access.
- The local mode is intentionally deterministic. Vietnamese/English intent parsing
  recognizes VND quantities, known payments, durations, explicit rate, repayment
  method and stress assumptions. Unknown fields are asked for rather than guessed.
  Product metadata comes from checked-in reviewed public sources, while math comes
  from the existing Decimal.js financial engine. A nominal monthly rate can be
  multiplied by 12 only with clear disclosure; it is not APR including fees.
- Optional OpenAI Responses and Anthropic Messages adapters can select strict allowlisted read-only
  operations, including bounded parallel proposals. It receives only the redacted current question following explicit
  per-request consent. No database profile, uploaded documents, previous turns,
  email, phone, private URL, tokens or user ID are sent. It receives a coarse tool
  completion acknowledgement, not private numerical output. A short qualitative
  model sentence may appear above the local explanation after a server guard excludes
  numbers, rates, links and eligibility claims. It is never used as calculation input.
  The server re-validates every selection and renders typed, deterministic blocks.
- Server SSE emits provider metadata, readable chunks, verified blocks and the
  persisted turn ID. Client retries use the same request ID. A bounded per-account
  rate limit, provider timeout, max tool rounds, max tokens and cancellation cap
  usage. Failure falls back to local and is disclosed. Logs record coarse status,
  timings, token counts and tool-selection counts without messages or profiles.
- Document evidence is untrusted; raw PDF or image text cannot select tools or
  execute actions. The document screen can open chat with an owned document ID;
  chat shows a local extraction summary and links back to the evidence. No extracted
  values enter external model prompts or calculations without explicit user input.
  Review and calculation are separate steps. Original uploads stay private.
- An explicit profile update in chat produces a typed proposal. Only the user's
  confirmation writes income, expenses and debt through the existing guarded
  profile route. Other consultation preferences stay in private conversation context.

## Limitations and evidence

- The supplied Vietnamese fixture set includes 33 evaluation cases. Some are desired
  behaviors for coverage expansion; this is not a claim of 33 passing live model runs.
- No live lender applications, private bank data, hosted infrastructure or financial transaction were used. The optional OpenAI adapter has mocked transport tests. A user-configured Claude gateway completed a synthetic authenticated three-turn consultation; typed schedules were checked against the Financial Calculation Engine. See the [Phase 1 report](../PHASE1_LIVE_AI_AGENT_REPORT.md) for commands and platform limits.
- Loan publications can change. Check the displayed verified date and source, and
  obtain written loan terms before making a decision. No crawler publishes values
  automatically. Payoff projection needs the assumed pay-off date/rate; it excludes
  contractual conditions not supplied.
- The finance profile continues to accept the existing income/expense/debt inputs.
  Emergency savings, reserve months, income stability and preferred repayment can
  be stated for a scenario and retained in authorized conversation context without
  silently writing the financial profile. The assistant asks for missing preferences
  during borrowing consultations. Increased expenses and reduced income remain
  scenario assumptions.
- No individual approved mascot illustration was supplied, only a brand guidance
  sheet. Finora preserves the approved logo/icon and does not crop a low-resolution
  mascot from the sheet.

See [research](INTELLIGENCE_RESEARCH.md), [provider configuration](OPENAI_PROVIDER.md),
[loan catalog](LOAN_CATALOG.md), and [evaluation](../evaluation/README.md).

## Signature conversation and follow-ups

The navigation dock opens the structured conversation directly at `/assistant`.
Existing `/intelligence` links open the same workspace, including a saved simulation
reference. Previous text-only chats remain available under **Sources and tools → Classic
chat history**; their separate history is not silently imported or deleted.

When a borrowing request lacks nominal interest or a repayment method, Fin retains
the explicit assumptions in the account's analysis history and asks for the
missing terms. A clarification can complete the same scenario; a follow-up such as
“Nếu thu nhập giảm 20% thì sao?” keeps both compared durations and applies the
change to the income the user actually supplied, or to the authorized financial
profile when no income was supplied. The profile is not updated implicitly.
A separate borrowing request (new amount/purpose without an explicit continuation)
does not inherit the preceding loan's assumptions.

The comparison uses the same principal, nominal rate, method and fee assumption.
Unknown fees stay unknown. The highlighted cash-flow value subtracts the highest
regular installment, not contractual one-off fees, and does not determine approval.
APR alone does not set the nominal rate. Comparing two terms does not save either:
the user can inspect the assumptions, draft a follow-up, and explicitly confirm the
specific amount and duration before adding a private simulation.

The database JSON keeps a versioned internal context alongside verified blocks;
legacy block-array rows remain readable, and the public response schema is unchanged.
Neither the saved context nor the profile or documents are sent to a provider.
A server binary older than this version cannot read the new internal JSON format;
do not downgrade the server against a live database without a rollback plan.

Regression coverage: `apps/api/test/intelligence-context.test.ts` verifies context
scope, prior assumptions, private legacy rows, unknown fees and APR. The browser
journey in `tests/e2e/intelligence-workspace.spec.ts` uses synthetic data and local
analysis to verify clarification, both durations, explicit stress submission,
review and confirmed saving.
