# Phase 2 matching: task and wireframe

Status: implementation review artifact; owner UAT remains pending.

## Task and information architecture

The signed-in borrower enters an amount and term in **Khám phá → Dữ liệu công bố**. Finora uses the owned financial profile on the server and returns an ordered comparison. The first question on the screen is **“Can any published product be confirmed suitable from the facts we have?”** A missing answer stays visible as a no-suitable state. The existing public list and two-product comparison remain available.

The source of truth for lender terms is the reviewed public catalog, for user budget the Better Auth-owned profile, and for schedules the Financial Calculation Engine. The scoring weights are policy assumptions. Neither scores nor condition statuses mean lender approval. A provider model sees none of the profile or matching output.

## Desktop wireframe

```text
┌ existing Finora shell ──────────────────────────────────────────────────────────┐
│ Khám phá / public vs sample rail                                                │
│ Own-term simulation link                                                        │
│ ┌ filters 226px ───────┐  ┌ result and public list ───────────────────────────┐ │
│ │ Search, category      │  │ Public-data notice                                │ │
│ │ Amount / term filter  │  │ No suitable loan / suitable count                 │ │
│ │ Compare shortlist     │  │ Ranked candidates: status, score, condition rows │ │
│ │                       │  │ component scores; monthly/cost/stress if known    │ │
│ │                       │  │ reasons, alternatives, dated official source     │ │
│ │                       │  │ Existing product grid and source detail          │ │
│ └───────────────────────┘  └───────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

At 390px, filters move above the result; each candidate keeps its status and score on the first line, then the condition rows, numbers and reasons. The existing filter sheet remains the entry point. The comparison overlay uses the same matching component for the selected pair before its published term grid.

## States and checks

1. Before amount and term: one instruction to use filters; no personalized score.
2. Loading/error: the result region retains its place and uses existing copy; the public catalog remains usable.
3. No suitable loan: explicit headline, candidate statuses, unknown fee/rate warnings and dated source links. No product receives a suitable badge.
4. Complete synthetic fixture: feasible candidates appear before insufficient or failed candidates; the five weighted components and engine totals reconcile.
5. Compare: the same two product IDs retain their scores and evidence. Back/close returns to the filtered list.
6. Fin AI: a validated `matchLoanProducts` selection produces the same typed result. Its explanation is local and deterministic because the external model cannot see the private result.

The existing brand tokens, navigation, surfaces and typography are reused. Chrome web at phone and desktop widths, dark appearance, Vietnamese wrapping, focus and filter recovery require visual QA; native safe areas and tap targets require a device or simulator before release.
