# FINORA 4.0 · Consumer fintech

Starts at main `dc15c6b`, after the upstream native Home and auth startup changes. This iteration changes the application experience, not the calculation engine, auth provider, API schema, database, AI permissions, or persisted financial data.

## Design selection

The [research review](FINORA_V4_RESEARCH.md) covers first-party visuals for 13 consumer finance products. The owner’s references point to a mobile banking Home, not an editorial page: prioritize one defensible number, short navigation paths, and an approachable mascot. MoMo informs the four visible shortcuts and feature discoverability; Techcombank informs the branded financial summary and legibility; Revolut informs quick transitions from a number to actions and activity. No competitor artwork, lender logo, or wallet balance is reproduced.

[Home sketches](previews/v4/index.html) use the same profile and repayment fixture at 390 × 844. They are concept renders, not connected app screenshots.

| Concept                                          | First read                                                                   | Trade-off                                                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [A · Tài chính của bạn](previews/v4/home-a.webp) | Forest repayment capacity, four icon-led actions, Fin assistant and activity | Selected: puts the useful decision and paths in the first view. The number must be labeled as an estimate, not a credit limit.                      |
| [B · Phân bổ thu nhập](previews/v4/home-b.webp)  | Income split, then actions                                                   | Honest and accessible if explicitly based on the profile, but emphasizes budgeting rather than borrowing. No transaction-history trend is inferred. |
| [C · Kỳ trả tiếp theo](previews/v4/home-c.webp)  | Dated installments from a specific tracked plan                              | Strong with an active plan, but has no credible first screen for a first-time borrower. Its timeline belongs in repayments.                         |

The visual direction uses a cool neutral canvas, forest/emerald, mint, and color-coded icon wells. Shared headings switch to Geist Bold; body remains Geist with Vietnamese diacritics. Existing system glyph fallback supplies the VND sign if Geist lacks it. The original logo, icon and favicon remain intact. The Fin sticker is isolated from the supplied approved mascot guide; it is not a new mascot design. Applied illustrations are limited to onboarding, Home and AI.

## Product decisions

- **Home:** actual estimated additional monthly capacity, a no-profile path, four shortcuts, mascot-led AI, saved simulations and real next installments. Upcoming amount is from the displayed installment, not the total of multiple entries; overdue uses its separate aggregate.
- **Navigation:** existing drag/release, tap, animated indicator, keyboard handling, accessibility, reduced-motion and platform-specific Liquid Glass paths retained. The home icon and the surrounding shell surfaces change visually. Web and Android use their original fallback.
- **Public:** the native and web startup still route signed-out users to authentication as upstream intended. The distinct production-rendered public tour lives at `/showcase` and is reachable from auth; its illustrated figure is marked as demo data.
- **Trust:** simulated terms, sourced catalog terms, user-confirmed obligations and AI responses remain separate. Unknown rates and fees are not invented. Private previews use existing authenticated document routes. No external model is required to use demo mode.

## Review procedure

Use the [existing demo setup](../architecture/INTELLIGENCE.md) and log in to a local demo account. Review the actual app at 375, 390, 430, 768, 1024 and 1440 CSS pixels, with the dock in view on narrow screens. Review Vietnamese figures, dark appearance, empty states, modal focus, comparison, account ownership and signed-out startup. A desktop browser at iPhone width is a web preview, not a native device verdict. Native JavaScript bundle exports, if verified, are not equivalent to iOS/Android installation or visual testing.

## Release evidence

See the [visual QA report](FINORA_V4_VISUAL_QA.md) for real before/after screenshots, the six-width review, dark appearance, and instructions to reproduce the captures. The separate visual test uses the live local API, real Mailpit OTP, and synthetic owner-scoped records.

The JavaScript exports for web, iOS, and Android and the NestJS build completed. Lint, formatting, typecheck, and 69 unit tests passed. All 17 functional browser scenarios passed; the opt-in visual suite also passed separately with 52 captures. A web regression test covers mouse and emulated-touch release navigation, cancellation, keyboard activation, and reduced motion. The original native event path and Liquid Glass code were preserved; no simulator or physical device test was available. The local runs did not use real OAuth credentials, live AI, or customer data. Nothing was deployed.

## Home and dock refinement

The mobile Home uses a full-width capacity panel and places the next tracked installment before the shortcuts. Profile income is split into expenses plus existing debt and the amount left before a new loan; overspending renders a labeled shortfall instead of a positive remainder. That cash figure does not replace the existing repayment-capacity estimate. The surface never fabricates a payment or a financial profile.

The featured Finora AI control remains the third of five tabs. Its fixed visual treatment is separate from the moving selected-tab indicator and does not change swipe-on-release, tap, keyboard activation, or reduced-motion logic. The workspace uses actual platform safe-area insets around the layout; no status-bar or Home-indicator pixels are baked into the app. Supported iOS uses cooperating native Liquid Glass shapes for the dock. Web and older devices use the shaped fallback; desktop retains its navigation rail.
