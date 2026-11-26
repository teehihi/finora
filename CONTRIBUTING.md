# Contributing to FINORA

Read [README](README.md) for local setup and [AGENTS.md](AGENTS.md) for the engineering rules that apply to contributors and coding assistants. This repository has not published a source-code license; see the [license and asset inventory](docs/maintainers/LICENSING.md). Only contribute code, images, fonts, or data you have permission to submit.

## Branches and pull requests

1. Start from the latest `main` in **`teehihi/finora`**. Use a separate branch such as `feat/repayment-planner`, `fix/otp-resend`, or `docs/local-setup`. Do not push directly or force-push to `main`.
2. Keep each pull request focused. Use a descriptive title such as `fix(auth): preserve the email when resending an OTP`.
3. Open the PR against `main`; use a draft if it is not ready for review. You can leave the generated description template untouched. GitHub fills it after the PR is created, then refreshes it when commits are pushed. The compare page only shows the static placeholder before you click **Create pull request**.
4. Wait for passing CI and another person's review before merging. A maintainer decides when to merge. Prefer squash when a PR has several work-in-progress commits. These are team conventions, not a claim that GitHub branch protection is enabled.

## What the PR description includes

- The changed areas, line counts, and commit subjects come from GitHub metadata.
- The **Verification** section links to the live PR checks. It reports touched test files, not whether a local command was run or passed.
- The **Risk and rollout** section flags paths related to migrations, environment config, data handling, or workflow permissions. No flag is not proof there is no risk.
- The workflow never links or closes an issue on its own. Add `Closes #123` only if the PR actually closes that issue. If you have manual test results or screenshots, add them outside the generated block. That text is preserved. Use synthetic data, and label web captures as web, not native device testing.

Only the marker-delimited block is regenerated. The workflow runs from trusted `main`; it does not check out or execute fork contributions. CI runs separately.

## Evidence before review

| Change                                  | Evidence                                                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation only                      | Run `pnpm format:check` or Prettier on the changed files. Try the updated instructions and links.                                                              |
| Application or package code             | Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Note any check you could not run.                                                            |
| UI, authentication, or read/write flows | Run relevant E2E tests. If you attach screenshots, label the browser, simulator, or device. Check safe areas and Liquid Glass fallback when changing the dock. |
| Calculations, data, documents, or AI    | Check relevant edge cases and note effects on existing data, access, consent, environment variables, and migration rollback.                                   |

Use a development environment and synthetic fixtures. Do not run tests against a production database or add secrets, OTPs, real loan documents, or personal information to commits, screenshots, issues, or logs. Report security issues through the [private channel](SECURITY.md).
