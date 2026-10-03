# Roll N Spice mobile tasks

## In progress
- [ ] Cart thumbnails and dedicated Account navigation (2026-10-03): reuse menu photos in cart, move sign-in/sign-out to Account and link About from Account. Implemented; awaiting Android visual/navigation confirmation.

## Up next
- [ ] Verify the complete Android flow, cross-device syncing, and then iOS; prepare EAS builds.
- [ ] Before release, resolve or reassess dependency advisories; validate any UUID override and Router decoder patch without SDK downgrades.

## Done
- [x] Mobile checkout, confirmation and own-order history (2026-10-03): durable account-scoped checkout, conflict review, confirmation and paginated order history implemented. Lint/typecheck, 10 order regressions, nine sync regressions, live API recovery/isolation, Android export and browser checks pass. User confirmed the Android flow works. Simplified customer copy to remove website assumptions, sync explanations and internal request IDs.
- [x] Authenticated mobile order API (2026-10-03): bearer-token verification with owner RLS, preserved cookie login, retry-safe mobile checkout and paginated own-order history. Website lint/build, 31 regression tests, real compiled HTTP/Supabase checks and local/live SQL suites pass; mobile lint/typecheck pass. Fixed shared-cart business conflicts to PT409 to prevent PostgREST retry loops. Temporary users/orders/cart records removed; six products and seven original orders preserved. User confirmed website API deployment on 2026-10-03.
- [x] Mobile shared-cart synchronization (approved 2026-10-03): implemented account snapshots, durable retries, guest merge, live revision refresh and sign-out isolation. Lint/typecheck, eight sync regressions, eight existing guest tests, live Supabase transport/Realtime/isolation checks and Android Hermes export pass. Temporary test accounts/cart data removed. User confirmed all Android acceptance checks on 2026-10-03: same-account website/app updates both ways, sign-out/restoration, guest merge once, and offline/reconnect/restart.
- [x] Website shared-cart integration and atomic checkout (2026-10-03): persistent account-scoped changes, one-time guest merge, live revision/refetch, offline/reconnect and sign-out isolation; checkout receipts prevent duplicate orders and preserve later additions. Website lint/build, 24 regression tests, isolated/live database tests and real two-session browser checks pass; fixture data removed. User confirmed deployment. Mobile synchronization is also user-verified on Android.
- [x] Shared-cart database foundation in the website repository/shared Supabase project — owner RLS, snapshot/mutation RPCs, retry/merge receipts, revision conflicts, quantity/product limits, and Realtime revision publication. Local/live rollback tests, actual concurrent requests, REST access checks, and website lint/build pass (2026-10-02). Temporary test data removed; website/mobile cart UI integration remains next.
- [x] Implement a persistent guest cart with validated quantities and product IDs (approved 2026-10-02).
  - Implemented Home Add to cart controls, Cart tab/count, quantity controls (1–99), removal, empty state, and device persistence using existing AsyncStorage. Only product IDs/quantities are saved; no account sync or checkout is implemented.
  - Catalogue refreshes on Cart focus. Totals use current integer-kobo prices; missing/invalid-price items stay removable and are excluded. Menu failures hide totals without erasing quantities; storage failures provide Retry.
  - Verification passed: lint, typecheck, eight cart tests (restore, validation, totals, ordered writes, failed reads/writes/retry), and Android Hermes export.
  - User confirmed adding, changing/removing quantities, close/reopen persistence, and decrement-at-one removal work on Android. Decrement removal is regression-tested; lint/typecheck pass (2026-10-02).

- [x] Implement Google sign-in, persistent sessions, and mobile auth return handling (approved 2026-10-02).
  - Code implemented: About account panel, native persistent sessions, secure S256 PKCE, validated/deduplicated cold/warm callbacks, foreground refresh, local sign-out, and cancellation/errors.
  - Verification: lint/typecheck, 11 callback validation tests, generated S256/matching flow-ID check, and Android Hermes export pass. These checks do not replace real-device Google login testing.
  - Expo login confirmed and project linked under dev14k: @dev14k/rollnspice-mobile (40de100e-9f33-4de1-a5e3-1c6732189c32).
  - First EAS build (416dabe1-99e7-427f-a528-0e2a1904a045) failed in Android resource linking: missing drawable/splashscreen_logo. Fixed the splash plugin configuration to explicitly use the existing starter splash image; final launch branding remains a release task.
  - Fix verified: splash plugin generates all five Android density drawables; lint/typecheck pass. Replacement build: https://expo.dev/accounts/dev14k/projects/rollnspice-mobile/builds/83ad7c71-448c-4ed2-917c-8bce52317a51. User confirmed APK installation.
  - User confirmed native Google sign-in succeeds on Android; screenshot shows signed-in account and Sign out control (2026-10-02). Earlier attempt returned to website and showed cancellation; root cause was not established.
  - User confirmed close/reopen session restoration, sign-out, and repeat login all work on Android (2026-10-02). Core Android acceptance complete; remaining edge cases tracked below.

- [x] Implement and verify the approved website brand on native screens — palette, bundled Anton/Inter, optimized food photos, mobile hero/menu cards, Home/About navigation; lint/typecheck and Android Hermes export pass; user confirmed Android visuals (2026-10-02).
- [x] Implement and verify the approved Supabase client/configuration and live read-only Home menu — public-key query returns six products; lint/typecheck and Android Hermes export pass; user confirmed the live menu works on Android (2026-10-02).
- [x] Review targeted dependency remediation for SDK 57 — no newer Expo/Router 57 patch available; decoder module-format mismatch and UUID override candidate documented; dependencies left unchanged.
- [x] Fix starter web hydration lint error, add npm run typecheck, and review dependency health — lint/typecheck and online Expo install --check pass (2026-10-02).
- [x] Create Expo SDK 57 starter in a separate repository and connect GitHub.
- [x] User confirmed the starter runs on an Android phone through Expo Go.
- [x] Record website integration boundaries and a proposed shared-cart plan.

## Remaining verification
- [ ] Device cart follow-up: exercise offline menu retry and unavailable-product handling.
- [ ] Verify auth background/foreground refresh, intentional Google cancellation, and callback return after closing the app during login; verify iOS during release testing.
- [ ] Optional auth improvement: show the Google account chooser on each login (not implemented).
- [ ] Exercise offline error/retry behavior on Android during end-to-end testing; the user's live-menu confirmation did not explicitly cover disconnect/retry.

## Baseline verification (2026-10-02)
- Typecheck: passed (`tsc --noEmit`).
- Expo-compatible ESLint dependencies and eslint.config.js installed by the approved lint setup retry.
- Lint: passed after replacing effect-driven hydration state with useSyncExternalStore; server/initial hydration retain light mode, client follows the native colour-scheme hook.
- Online Expo install --check: dependencies are up to date for SDK 57.
- Live npm audit: 16 affected-package findings (12 moderate, 4 high), propagated from node-forge, uuid and decode-uri-component. See MOBILE_PLAN.md for the review. No dependency upgrades or overrides applied.
