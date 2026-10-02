# Roll N Spice mobile tasks

## In progress

## Up next
- [ ] Implement Google sign-in, persistent sessions, and mobile auth return handling.
- [ ] Implement a persistent guest cart with validated quantities and product IDs.
- [ ] Implement approved shared-cart schema/RPCs and website integration in the website repository.
- [ ] Add mobile cart synchronization, guest merge, reconnect handling, and sign-out isolation.
- [ ] Extend and verify the website order API for authenticated mobile requests.
- [ ] Implement mobile checkout and own-order history using shared data.
- [ ] Verify the complete Android flow, cross-device syncing, and then iOS; prepare EAS builds.
- [ ] Before release, resolve or reassess dependency advisories; validate any UUID override and Router decoder patch without SDK downgrades.

## Done
- [x] Implement and verify the approved website brand on native screens — palette, bundled Anton/Inter, optimized food photos, mobile hero/menu cards, Home/About navigation; lint/typecheck and Android Hermes export pass; user confirmed Android visuals (2026-10-02).
- [x] Implement and verify the approved Supabase client/configuration and live read-only Home menu — public-key query returns six products; lint/typecheck and Android Hermes export pass; user confirmed the live menu works on Android (2026-10-02).
- [x] Review targeted dependency remediation for SDK 57 — no newer Expo/Router 57 patch available; decoder module-format mismatch and UUID override candidate documented; dependencies left unchanged.
- [x] Fix starter web hydration lint error, add npm run typecheck, and review dependency health — lint/typecheck and online Expo install --check pass (2026-10-02).
- [x] Create Expo SDK 57 starter in a separate repository and connect GitHub.
- [x] User confirmed the starter runs on an Android phone through Expo Go.
- [x] Record website integration boundaries and a proposed shared-cart plan.

## Remaining verification
- [ ] Exercise offline error/retry behavior on Android during end-to-end testing; the user's live-menu confirmation did not explicitly cover disconnect/retry.

## Baseline verification (2026-10-02)
- Typecheck: passed (`tsc --noEmit`).
- Expo-compatible ESLint dependencies and eslint.config.js installed by the approved lint setup retry.
- Lint: passed after replacing effect-driven hydration state with useSyncExternalStore; server/initial hydration retain light mode, client follows the native colour-scheme hook.
- Online Expo install --check: dependencies are up to date for SDK 57.
- Live npm audit: 16 affected-package findings (12 moderate, 4 high), propagated from node-forge, uuid and decode-uri-component. See MOBILE_PLAN.md for the review. No dependency upgrades or overrides applied.
