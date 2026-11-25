# Finora Intelligence 3.0

This phase extends the Product Experience 2.0 branch and keeps the existing V2
assistant and saved simulations usable. The Analysis Desk, public catalog, private
document review, and manually tracked repayments are distinct workspace surfaces.
Finora does not approve loans, apply on the user's behalf, or initiate payments.

## Local setup and demo

1. Use Node 22 and the workspace pnpm version. Run `pnpm install`, `pnpm setup`,
   and `pnpm dev`. Apply migrations to your existing database; do not reset it.
2. Sign in with Mailpit OTP. In Hồ sơ set monthly income to 15,000,000 ₫, living
   costs to 8,000,000 ₫ and existing debt payments to 1,000,000 ₫.
3. In Finora AI, open Phân tích khoản vay. Try:
   **“Vay 50 triệu tiêu dùng, lãi 12%/năm trả góp đều trong 12 và 24 tháng. Thu nhập giảm 20% thì sao?”**
   The result separates the 35% planning capacity, public products with official
   sources, and two deterministic schedules using the supplied assumptions.
   Unknown fee leaves total including fees unknown. Nothing is saved until confirmed.
4. Ask **“Nếu vay trong 36 tháng thì sao?”** to continue from the owned saved conversation;
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
- The optional real OpenAI Responses adapter can select strict allowlisted read-only
  operations. It receives only the redacted current question following explicit
  per-request consent. No database profile, uploaded documents, previous turns,
  email, phone, private URL, tokens or user ID are sent. It receives a coarse tool
  completion acknowledgement, not private numerical output. Its free-form text
  is never used as calculation input or rendered guidance. The server re-validates
  any selection and renders typed, deterministic blocks with localized explanations.
- Server SSE emits provider metadata, readable chunks, verified blocks and the
  persisted turn ID. Client retries use the same request ID. A bounded per-account
  rate limit, provider timeout, max tool rounds, max tokens and cancellation cap
  usage. Failure falls back to local and is disclosed. Logs record coarse status,
  timings, token counts and tool-selection counts without messages or profiles.
- Document evidence is untrusted; raw PDF or image text cannot select tools or
  execute actions. Review and calculation are separate steps. Original uploads stay
  private, before and after review.

## Limitations and evidence

- The supplied Vietnamese fixture set includes 33 evaluation cases. Some are desired
  behaviors for coverage expansion; this is not a claim of 33 passing live model runs.
- No provider credentials, live lender applications, private bank data, hosted
  infrastructure or financial transaction were used. The optional OpenAI adapter
  has mocked transport tests; no live inference was tested.
- Loan publications can change. Check the displayed verified date and source, and
  obtain written loan terms before making a decision. No crawler publishes values
  automatically. Payoff projection needs the assumed pay-off date/rate; it excludes
  contractual conditions not supplied.
- The finance profile continues to accept the existing income/expense/debt inputs.
  Emergency reserve, increased expenses, and reduced income may be stated for a
  scenario without silently writing the profile.
- No individual approved mascot illustration was supplied, only a brand guidance
  sheet. Finora preserves the approved logo/icon and does not crop a low-resolution
  mascot from the sheet.

See [research](INTELLIGENCE_RESEARCH.md), [provider configuration](OPENAI_PROVIDER.md),
[loan catalog](LOAN_CATALOG.md), and [evaluation](../evaluation/README.md).
