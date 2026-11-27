# Phase 3 · Financial Digital Twin UX evidence

## Task and entry

From an owned saved simulation, open **Future cash flow**. Review the saved loan terms, enter the monthly budget split and optional savings, select one or more shocks, then run the projection. Return to the saved plan without mutating it. The result compares the original schedule to the selected hypothetical scenario.

## Information architecture and wireframe

```text
Saved simulation → [Open future cash flow]
  ← Back                         Financial Digital Twin
  Saved loan amount / rate / method / term (read only)
  ┌ Monthly financial state ──────────────────────────┐
  │ Income  Essential  Discretionary  Existing debt  │
  │ Savings (optional)  Emergency fund (optional)     │
  │ Profile expense total is a hint, not a split.     │
  └────────────────────────────────────────────────────┘
  ┌ Scenario controls ────────────────────────────────┐
  │ Scenario type   start month   duration   severity │
  │ [Add shock]   Added shocks   [Run projection]     │
  └────────────────────────────────────────────────────┘
  Result: resilience / first shortfall / unknown costs
  Baseline vs scenario monthly cash flow bars
  Savings and remaining balance lines/table values
  Select month → one shared backend row, full breakdown
  Assumptions, early repayment policy warning, thresholds
```

## State and recovery

- Blank amount means unknown; typing `0` is an explicit zero. Core budget fields must be filled before rows appear.
- Savings and emergency reserve remain nullable. Coverage and savings projection remain unknown when needed inputs are absent.
- Loading disables duplicate requests; failed requests keep form values and allow retry. Back never saves or changes a loan.
- The existing saved simulation route is owner scoped. The UI reads no other person's financial state.
- Mobile stacks controls and provides 44 px tap targets; desktop uses the same structure with wider content. Review real renders at narrow/web/dark; native QA is still required before release.

## Design decision

Use FINORA `Page`, `MarketPanel`, typography, colors and spacing. Charts use simple labeled bars so color is never the only signal. No new visual theme or animation. This document is a renderable implementation plan, not owner approval or UAT.
