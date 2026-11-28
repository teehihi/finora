# FINORA · Phase 4 completion report

Date: 28 November 2026. Branch: `codex/phase4-document-intelligence`.

## Delivered

- Kept the existing private document storage, Better Auth ownership checks and deterministic financial engine. No database reset or migration was needed; new metadata lives in the existing extraction JSON.
- Added native PDF text extraction followed by Vietnamese/English Tesseract OCR for image-only PDF pages, JPEG and PNG. Analysis is bounded to 20 PDF pages and 5 MiB input, with time, pixel, output and concurrency limits. Page numbers and OCR boxes accompany evidence where available.
- Extracted 20 loan term types with explicit found, missing, conflicting and unsupported states. Raw values, normalized units, evidence, extraction method and an uncalibrated review indicator remain distinct. Missing fees stay unknown.
- Added grounded, rule-based concerns for additional fees, insurance, interest ambiguity, early/late repayment terms, conflicting and absent terms. The analyzer makes no legal or approval judgment. Document text is never forwarded to an external AI provider.
- Added an owner-guarded PDF page preview and evidence focus, editable terms and an explicit user confirmation path. Corrections outside the calculation form persist as user-confirmed terms separately from OCR extraction. The existing calculation form feeds only confirmed values into the financial engine. Published product comparison retains unknown published costs.
- Added localized Vietnamese/English review UI and Fin document result metadata. The existing chat can request a validated document review tool, while the private source text stays on the server.

## Main files

| Area                     | Files                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contracts                | `packages/contracts/src/index.ts`, `packages/contracts/src/intelligence.ts`                                                                                                     |
| Readers and extraction   | `apps/api/src/modules/document-extraction.ts`, `document-ocr.ts`, `document-fields.ts`, `document-risk.ts`                                                                      |
| Owner API and Fin        | `apps/api/src/modules/document-intelligence.ts`, `intelligence.ts`                                                                                                              |
| Review UI                | `apps/app/app/(workspace)/documents/[id].tsx`, `apps/app/src/features/documents/PrivatePreview.tsx`, `client.ts`, `compare.ts`, `apps/app/src/features/intelligence/blocks.tsx` |
| Localization and setup   | `packages/i18n/src/document.ts`, `apps/api/.env.example`, `turbo.json`, `scripts/setup.mjs`, `packages/database/scripts/db.mjs`                                                 |
| Tests and fixtures       | `apps/api/test/document-*.test.ts`, `apps/api/test/fixtures/`, `apps/app/test/document-comparison.test.tsx`, `tests/e2e/document-intelligence.spec.ts`                          |
| Design and documentation | `docs/product-design/PHASE4_DOCUMENT_REVIEW_WIREFRAME.md`, `docs/architecture/DOCUMENT_INTELLIGENCE.md`                                                                         |

## Verification on this workstation

`pnpm run setup` completed with PostgreSQL 17 and Mailpit in Compose; the existing database volume was preserved. Local Poppler 26.09.0 and Tesseract 5.4.0 with `vie+eng` were used for actual OCR. The following commands completed after the final feature edits:

| Command                                                                   | Observed result                                                                                                                                       |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                                               | Exit 0, no ESLint warnings                                                                                                                            |
| `pnpm typecheck`                                                          | 16/16 Turbo tasks passed                                                                                                                              |
| `pnpm test` with `DOCUMENT_OCR_LANGS=vie+eng` and local `TESSDATA_PREFIX` | 10/10 Turbo tasks; API 18 suites / 109 tests; app 29 suites / 120 tests; financial engine 5 files / 52 tests; network tests passed                    |
| `pnpm build`                                                              | 9/9 Turbo tasks; API compiled and Expo web exported                                                                                                   |
| `pnpm exec playwright test tests/e2e/document-intelligence.spec.ts`       | Chromium web 3/3 passed: private PDF review, correction persistence and foreign-user denial; manual image recovery; Vietnamese scanned image evidence |

The OCR evaluation invokes actual Poppler/Tesseract over **five small synthetic files**, not real lender contracts. The development split has 2 files; the separate holdout split has 3. For the labeled fields in this set, both splits measured precision/recall/F1 = 1.00, exact monetary match = 1.00, evidence citation accuracy = 1.00, unsupported extraction rate = 0, and missing-field handling = 1.00. The holdout conflict case was detected. Measured median latency was 1,035 ms on development and 320 ms on holdout; maximum was 1,035 ms and 1,013 ms respectively in that test run. A separate text-only dataset (4 development and 4 holdout transcripts) also scored 1.00 on its labeled fields; that test does **not** measure OCR accuracy. These small, template-like fixtures do not establish accuracy on real, complex or degraded contracts.

Visual review used actual Chromium screenshots at 1440 px desktop and 390 px mobile web, including the review, comparison, private PDF preview and dark mode. The source preview and correction flow were exercised in Chromium. iOS and Android native devices were **not** run, so safe area and native typography still require owner UAT. No real account, OTP, contract or production database was used.

## Limits and next steps

- Recognition currently relies on explicit labels and predictable value formats. Tables, handwriting, mixed currencies, highly degraded scans and more than 20 PDF pages need broader labeled evaluation and extraction work.
- Confidence labels describe extraction paths, not calibrated probabilities. The evaluation corpus is too small for any product accuracy claim.
- User-confirmed ancillary terms are stored for review but are not silently folded into the monthly financial engine; fees enter the schedule only through the separately confirmed total-fee input. Variable rates and nonmonthly payment schedules remain hypothetical under the fixed monthly simulator and need dedicated modeling before they can be calculated as contract schedules.
- Native device visual QA, accessibility review with assistive technology, and owner UAT remain open.
