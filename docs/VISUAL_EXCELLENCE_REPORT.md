# FINORA Signature · Visual Excellence 5.0

**Review branch:** `feat/finora-visual-excellence`
**Base:** merged `main` at `4527518`. Its tree
`ade9d2d9575b362618b56c0fbc1b45c115bfd05d` matched the completed Product Excellence
handoff exactly. Original sprint history was left untouched. This visual branch
was worked on locally; `main` and deployment configuration were not changed.

## Implemented

| Area                   | Change                                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design foundation      | Warm neutral canvases, richer forest tones, lime as a controlled action highlight, darker secondary text, original leaf contours, and shared colored icon plates. Retained the supplied logo and Fin mascot. Geist stays the bundled typography for Vietnamese and tabular VND. |
| Home                   | A larger capacity focal point and clearer cash allocation; expanded tools with consistent icon geometry; a distinct next-payment row; separate saved estimates and a secondary Fin shortcut. Kept the profile CTA and all empty/loading paths.                                  |
| Finora AI              | Branded welcome with approved Fin artwork, differentiated starter actions, a stronger composer with distinct disabled/focus/streaming treatments, and financial receipts and common-scale scenario comparisons. Preserved privacy status, opt-in and tool behavior.             |
| Simulator              | Separated loan terms from results on desktop; emphasized the amount, term controls and first repayment; gave one-time fees and total their own hierarchy. Added a compact scheduled-payment chart based on the existing schedule, without implying fees are known.              |
| Explore and comparison | Emphasized institution and advertised rate while keeping period, rate basis and published ranges visible. Gave offers and personal simulation distinct entry points. Kept equal-weight A/B layouts and progressive access to details and source links.                          |
| Access                 | Replaced the detached mobile marketing slab and white card with a compact brand rail and direct form. Desktop has an integrated split canvas. Refined OTP, recovery and keyboard-friendly focus without changing authentication or provider availability.                       |
| Supporting surfaces    | Extended the system to document intake/review, financial profile and settings identity, saved scenarios, repayment summary and public tour. These are targeted refinements, not new workflows.                                                                                  |

No financial calculations, auth logic, retention rules, permissions, database
schema, API contracts, document handling or deployment settings were changed.
The approved dock still owns navigation; its code and interaction contract were
not replaced.

## Design review and evidence

See [audit and design decisions](design-system/FINORA_SIGNATURE.md) for the starting
screens and first-party references (MoMo, Techcombank, Cake, Revolut, Nubank and
Monzo). Competitor visuals were inspected as references, not used in the app.

The delivery archive includes screenshots from the actual baseline and
redesigned Expo web exports. Compare `before/`, `signature-checkpoint/`, and
`after/`. Home, Finora AI and Simulator were reviewed after the first
implementation, then refined: Home compresses the summary vertically and adapts
large figures, the AI composer distinguishes empty/disabled from send-ready,
and the simulator chart has a clearer baseline and stronger bar contrast.

The final visual run expects 390, 430, 768 and 1440 px signature views, with home
at additional widths. The evidence includes populated and first-run states,
a forced local loading capture and a simulated provider outage. Those two
states are intentionally intercepted fixtures. OTP and normal owner workflows
use isolated PostgreSQL and local Mailpit with synthetic accounts.

## Known limitations and next steps

1. Verify keyboard and Dynamic Type at larger font sizes on a real iPhone, and
   test VoiceOver and TalkBack reachability. A responsive browser is not native
   runtime evidence.
2. Verify native Liquid Glass on a supported device and Android fallback
   visually. Existing browser dock interaction tests do not prove native glass.
3. For a future polish pass, run real-user comparison and repayment tasks,
   check narrow Android devices, and measure scroll and screen-reader behavior.
   Retail competitor imagery is inspiration, not a claim of visual parity.

## Verification

The app under test is `a669065`; the handoff commit adds this report.

- **Build and static checks:** Prettier, ESLint, TypeScript and the Expo web build
  passed with the repository's Node 22.20.0 / pnpm 10.32.1 setup.
- **Automated units:** 31 financial-engine, 52 API Jest and 36 app Jest tests
  passed, plus five network/auth script checks. The app tests include new
  minimum-contrast checks for ten light and dark token pairs; these do not
  prove full accessibility conformance.
- **Native export:** Expo generated iOS and Android Hermes bundles from this
  revision. No simulator/emulator, signing, native runtime or hardware tests
  were available; native color, keyboard and dock behavior remain unverified.
- **Test environment:** disposable PostgreSQL, local Mailpit and synthetic
  fixtures only. No external inference, real credentials or deployment.
- **Interim QA:** an intercepted loading response was initially still in
  flight when the visual test navigated away. The harness now awaits that
  response before renavigation. An in-progress visual run also overlapped
  with a subsequent export replacing the web output directory; the final
  run serves a fixed build.
- **Final Chromium regression:** all **27/27** cases passed; no skips or
  failures. The run included OTP, recovery, the responsive workspace, loan
  comparison and calculations, AI, document access and ownership, confirmed
  repayment, the dock gesture and the visual capture journey.
- **Delivered evidence:** 52 baseline, 6 first-pass, and 70 final browser
  captures. These are not native screenshots.
