This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Roll N Spice project context and workflow

- This is the mobile client for the existing website at https://rollnspice.vercel.app. Website source: `C:\rollnspice`. Reuse its Supabase project, users, products, orders, and server-side email integration.
- Read `TASKS.md` and `MOBILE_PLAN.md` at the start of each session. Work on one small task at a time; write a short implementation plan and get user approval before feature code, dependency additions, environment variables, or changes to the website/database.
- Android is the primary test device; verify iOS after the core flow works. Use Git Bash syntax for commands shown to the user.
- Keep non-route code outside `src/app/`. Centralize Supabase access in a helper when implemented. Prefer small files (roughly 150 lines).
- Only the Supabase URL and publishable key may be included in the mobile bundle. Never copy `SUPABASE_SECRET_KEY`, service-role keys, or Mailgun variables into this repository. `EXPO_PUBLIC_` values are public; propose new variables before adding them.
- Every exposed database table must have RLS. Users may only access their own private data. Never trust a client-sent user ID, price, subtotal, or order status: derive identity from verified authentication and prices from products on the server/database.
- Follow the website's approved street-food design and exact live catalogue; do not invent products, prices, ratings, promotions, or delivery promises.
- Shared-cart sync is a planned feature, not existing behavior. See `MOBILE_PLAN.md` for the guest merge, offline, and API decisions awaiting approval.
- Update task status and record decisions after each approved task. Do not change the website/database from this workspace without explicit authorization.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
