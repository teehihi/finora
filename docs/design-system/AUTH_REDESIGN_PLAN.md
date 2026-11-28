# FINORA · Authentication redesign

## Scope and source of truth

- One existing Expo Router route, `/auth`, owns email OTP and legacy-password
  sign-in. Better Auth creates first-time users through email OTP, so no
  separate registration form is needed.
- `/api/auth/providers` is authoritative for provider availability. Google is
  implemented in the client and server, but is currently unconfigured because
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are absent. The UI reserves a
  stable provider area and communicates this state without enabling a dead
  action.
- Password-reset endpoints are explicitly disabled in
  `apps/api/src/modules/auth.ts`; the account settings UI supports verifying an
  existing email, not reset. Do not introduce a recovery CTA until its backend
  and email flow are supported.
- Existing OTP length, attempt limit, resend cooldown, session restoration,
  owner-safe return routes, localization, and theme tokens remain authoritative.

## Neutral wireframe

### Mobile, entry/password

```text
┌────────────────────────────┐
│          Finora       EN   │
│   Vay thông minh. Trả chủ động. │
│                            │
│       Đăng nhập             │
│       Nhập email để tiếp tục│
│       [ mail  Email       ] │
│       [      Tiếp tục     →]│
│       Đăng nhập bằng mật khẩu│
│       ─── provider slot ─── │
│       [ Google / state ]    │
│                            │
│       Fin at bottom edge    │
└────────────────────────────┘
```

### Mobile, OTP

```text
┌────────────────────────────┐
│  ‹       Finora       EN   │
│   Vay thông minh. Trả chủ động. │
│        Fin + envelope       │
│       Xác minh email        │
│  Nhập mã 6 số đã gửi đến…   │
│  te••••@example.com  Sửa    │
│       [1][2][3][4][5][6]   │
│       [      Xác minh     ] │
│  Chưa nhận được mã? Gửi lại │
└────────────────────────────┘
```

### Web

Keep the same header, form order, labels, and provider region. At wide sizes,
use the dedicated Finora login artwork as a calm side illustration beside the
form; never repeat its text or add another sign-in card. At narrow sizes, use
the mobile composition and bottom-edge mascot.

## Interaction map

```text
Email → OTP → session restore → allowed return route
  ├─ edit email → Email
  ├─ invalid/expired code → OTP with email and code retained for correction
  ├─ resend after server cooldown → OTP
  └─ use password → Password → session restore
       └─ use email code → Email
```

Email OTP is the account-creation path. No separate registration step is added.
Password reset remains out of scope until the server recovery workflow is
enabled. The Google action stays in its own provider slot, visible but disabled
until the server reports it configured.

## Visual direction

- Reuse existing forest, paper, sage, and lime tokens; keep interactive content
  on a light surface in light mode and the existing dark surfaces in dark mode.
- Center the existing logo and slogan in a shared header; keep language at the
  trailing edge and show a back action on nested steps.
- Use one shared input, button, inline-error, provider, backdrop, and mascot
  treatment across email, OTP, and password states.
- Keep the bottom illustration away from controls and hide it while the keyboard
  is open or space is constrained.
- OTP uses one accessible native input with six rounded visual cells, system
  autofill, paste, and an explicit verification action.

## Unverified/unsupported requirements

- Forgot-password/reset is unsupported by the existing server and remains
  hidden rather than presenting a nonfunctional path.
- Physical-device keyboard, VoiceOver/TalkBack, and owner UAT require review on
  target devices after the web/simulator review.
