# Access and public-tour sprint

## Design and scope

- Keep the established signed-out entry point at `/auth`. Users can open `/showcase` from sign-in on web or native without changing authentication or deep-link guards.
- Replace the static financial-dashboard illustration with an interactive, explicitly fictional borrowing example. It uses the same deterministic engine as the simulator. Switch between 12 and 24 months, and read the first instalment, interest and principal plus interest. Unspecified fees and insurance are excluded, not assumed zero. The demo requires no profile, login, or simulation API request.
- Use the financial hierarchy recommended in [FINORA 4.0 research](FINORA_V4_RESEARCH.md): one specific amount in a short forest panel, immediately followed by a useful interaction and its assumptions. The curve treatment follows FINORA’s own leaf rather than implying a market trend. Preserve the approved logo, mascot and existing global typography. On narrow screens the form comes earlier; the OTP view has no marketing art.
- If the API is unreachable, retry from the affected step without clearing the email or code. Returning to the same email within the resend window reopens the already-sent challenge instead of requesting a replacement. If verification succeeded but the session is not available yet, offer session recovery without resubmitting the one-time code. Legacy password and configured Google paths are retained, not simulated.

## Verification

The source for access regression coverage is [the Playwright auth suite](../../tests/e2e/auth.spec.ts). It includes actual OTP delivery through local Mailpit, legacy password login and verification, and three browser checks for the public demo, provider failure recovery and an interrupted session restoration. The last two recovery checks intentionally use controlled route responses to exercise failure states. No configured third-party OAuth provider or physical device is required for this evidence and none was simulated as an integration.
