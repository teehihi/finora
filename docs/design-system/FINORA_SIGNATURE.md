# FINORA Signature · visual direction

## Baseline

The visual branch starts from merged `main` at `4527518`. Its Git tree is identical to
the completed Product Excellence handoff, so the previous 27-test baseline applies
to the starting application, not to any redesign changes. The app was also served
fresh against disposable fixtures and captured with the browser visual journey.

- **Home:** the capacity amount reads well, but thin headings and 40 px action
  plates make the rest of the screen feel secondary. Upcoming and saved items look
  too similar for an actual obligation versus a draft.
- **Finora AI:** a narrow starter stack and low-weight composer read as standard
  chat; the assistant's loan scenarios should feel like financial decisions.
- **Simulator:** comparable controls all use the same visual weight. The amount,
  payment and path from editing to review deserve distinct positions.
- **Explore, detail and access:** rate, source, disclaimers and actions compete
  for attention. The sign-in hero is visually detached from its white form.
- **Dark and supporting surfaces:** several pale or gray cards repeat the same
  hierarchy. Stronger contrast should come from palettes and spacing, not from
  making every card forest green.

## Research to decisions

- [MoMo Ví Trả Sau](https://www.momo.vn/blog/huong-dan-cach-thanh-toan-du-no-vi-tra-sau-tren-momo-c116dt1961):
  group the amount and due date with the relevant action, without copying the
  payment CTA into Finora's non-payment tracker.
- [Techcombank Mobile](https://techcombank.com/thong-tin/thong-bao/techcombank-ra-mat-giao-dien-hoan-toan-moi-nang-tam-trai-nghiem-tai-chinh-so):
  concentrate color and identity in one area, leaving utilitarian information calm.
- [Cake](https://cake.vn/tin-tuc/tai-chinh/cac-phuong-thuc-thanh-toan-khoan-vay-tai-ngan-hang-so-Cake):
  keep the loan, selected repayment action and confirmation visually distinct.
- [Revolut 10](https://www.revolut.com/blog/post/revolut-10/):
  make the main number accessible at a glance and put tools immediately after it.
- [Nubank navigation](https://building.nu.com/how-we-created-tabs/) and
  [dark mode](https://building.nu.com/the-birth-of-the-dark-mode-a-journey-into-nubanks-app-evolution/):
  group by intent, preserve the familiar dock and theme role-based tokens.
- [Monzo Home](https://monzo.com/blog/the-new-and-improved-home-screen):
  put recent and upcoming activity close to the financial overview; separate actual
  tracked installments from saved hypothetical plans.

## Finora rules

- Use original leaf contours in selected signature surfaces. Keep approved mark
  and mascot. Use lime as a controlled highlight paired with dark ink.
- Geist remains the production family: it is already bundled, supports Vietnamese,
  and gives compact tabular amounts. Be Vietnam Pro is a credible alternative for
  wider Vietnamese display text, but a font swap would change layout metrics and
  require a new bundled dependency. System sans is a sensible fallback but would
  produce inconsistent headline density across iOS, Android and browser.
- Use a consistent icon stroke and geometric plates; use the accent families to
  distinguish jobs, not as the only representation of status.
- Keep an unknown fee distinct from zero and an estimate distinct from an
  obligation. Use financial amounts as focal points without changing the engine.
