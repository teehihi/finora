# Personal repayment tracking

Saving a simulation does not create a loan. Its owner can review the simulated
principal, interest method and saved schedule and explicitly record that the
loan was taken out. This references the owner's immutable saved schedule and
does not verify the agreement with a lender. A simulation is tracked at most
once; creating the same tracking record again returns the existing one.
Recording or undoing a payment requires a separate user confirmation.

- Due totals include only unchecked installments scheduled from today (Vietnam
  time) through the next 29 calendar dates. Past-due dates are shown separately.
- Remaining principal and principal plus interest are sums of unchecked schedule
  rows, not real-time lender balances. Out-of-order confirmations do not
  decrement earlier unchecked payments. Separate fees, penalties, and ad hoc
  early repayments are not inferred.
- The database enforces that the simulation and tracking record have the same
  owner, and API requests scope each record to the authenticated session. Any
  actual deletion of the parent snapshot would also remove its tracking record.
- Reminders are computed on read and rendered inside the app. No bank access,
  money movement, background reminder task, native notification request or
  email is sent. The due ledger can supply a future opt-in notification adapter;
  consent and delivery are intentionally not implemented here.

## Verification

The deterministic unit suite covers required confirmation, malformed snapshots,
Vietnam-local date boundaries, and manual out-of-order status. A Chromium journey
on the local Expo export and PostgreSQL 17 confirms that saving does not start
tracking, the confirmation dialog does not mutate data, confirmed progress
persists after reload, undo restores the due amount, and a separate user cannot
access or alter the ledger.

Rendered examples: [390px before payment](../design-system/screenshots/intelligence-v3/repayments-390.webp)
and [1440px after confirming the first installment](../design-system/screenshots/intelligence-v3/repayments-1440.webp).
