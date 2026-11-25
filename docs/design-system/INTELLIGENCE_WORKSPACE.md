# Borrowing analysis desk

The Intelligence view extends rather than replaces the Product Experience 2.0 assistant. It opens from Finora AI, a saved simulation, or the published catalog. A catalog link can prefill a plain question but cannot send it. The screen uses the existing forest, ivory, and sage system and puts the user's question and deterministic receipts ahead of the much denser offer terms.

## Implementation choices

- The client validates shared schemas for history and every stream event. Rendering stays within a small finite set of native components: affordability, repayment scenario, published offers, missing information, and notice. There is no generated HTML renderer.
- Responses have their own provider marker. External routing is offered only if configured on the authenticated server and requires an opt-in for the next question. The default remains local. This UI labels current consent separately from which provider handled a previous turn.
- Calculation and provenance are separate: a scenario names its assumed or saved input, unknown fees remain unknown, and published terms are supplementary to calculated receipts. Outbound source actions expose the actual hostname and permit only user-initiated public HTTPS links.
- Saving requires an explicit confirmation for a specific persisted scenario. The confirmation tells the user it does not create a real loan or mark a payment. The resulting saved route exposes the existing repayment schedule.
- Mobile uses the dock insets of the existing workspace, with a bottom sheet for sources and privacy. Desktop uses a side rail outside the reading column. Stream updates keep an anchored reading position unless the user has already scrolled away, and only high-level lifecycle messages are announced to assistive technology.

Patterns used: [Expo Router navigation and deep links](https://docs.expo.dev/router/basics/navigation/) for typed inward routes; [Expo linking](https://docs.expo.dev/linking/into-other-apps/) for explicit outward links; [W3C WCAG live-region technique](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA23) for announcing state updates without moving focus.

## Rendered verification

- Empty desk: [390px](screenshots/intelligence-v3/intelligence-empty-390.webp) · [1440px](screenshots/intelligence-v3/intelligence-empty-1440.webp).
- Structured scenarios: [390px, stacked](screenshots/intelligence-v3/intelligence-scenario-390.webp) · [1440px, side by side](screenshots/intelligence-v3/intelligence-scenario-1440.webp).

The Playwright flow ran against the local Expo web export, NestJS and PostgreSQL with the disclosed mock provider. It verified that an authenticated user opens the desk from the original assistant, the selected tab is exposed semantically, a URL prefill does not submit, 24- and 36-month deterministic scenarios are shown with no horizontal overflow, and the confirmations save a plan only after an explicit click. It then reopened the persisted repayment schedule and returned to the desk with the saved simulation attached. The screenshots are actual rendered states. Physical-device behavior and live external model results are outside this browser check.
