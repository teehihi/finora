# Finora AI visual iterations

All images below are rendered browser states against the local Expo build and PostgreSQL/NestJS sandbox, not edited mockups. The visible assistant runs the repository's **local mock** provider. The example uses a synthetic ₫12 million, twelve-month simulation whose fee is not known.

## 1. Establish the conversation and the evidence

[390px, empty](screenshots/iterations/assistant/1-mobile-empty.webp) · [390px, picker](screenshots/iterations/assistant/1-mobile-context.webp) · [390px, response](screenshots/iterations/assistant/1-mobile-answer.webp) · [1440px, response](screenshots/iterations/assistant/1-desktop-answer.webp)

The restrained prompt list, visible mock label, bottom composer and in-thread receipt made the core path legible. The small viewport showed the bottom of an intro heading as auto-follow started. The web textarea was taller than necessary, and the right-hand rail repeated the same computed figures already in the answered message.

## 2. Reduce repeats and stabilize the reading edge

[390px, response](screenshots/iterations/assistant/2-mobile-answer.webp) · [1440px, response](screenshots/iterations/assistant/2-desktop-answer.webp)

Once a conversation exists, the narrow layout keeps a compact, intact heading above the scroll area. The visible input measured 44px high rather than 64px. The desktop rail now shows the selected plan inputs instead of a second copy of the response. The reload check identified another weakness: the answer survived, but a manually selected reference did not.

## 3. Keep context while moving around

[390px, response](screenshots/iterations/assistant/3-mobile-answer.webp) · [1440px, response](screenshots/iterations/assistant/3-desktop-answer.webp) · [360px, dark mode](screenshots/iterations/assistant/3-mobile-dark-360.webp)

The page retains the selected simulation through the existing route's opaque ID, and the server still resolves it only within the signed-in account. The picker distinguishes plans by amount, term and date. The receipt names its source before the values and leaves unreported fees unknown. At 360px in dark mode the heading and mock marker wrap without horizontal overflow; the composer remains separate from mobile navigation. At 390px the visible composer measured 44px high.
