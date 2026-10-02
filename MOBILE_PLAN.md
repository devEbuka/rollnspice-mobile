# Mobile integration plan

Status: staged implementation, 2026-10-02. The baseline, dependency review, live menu, branding, and Google authentication implementation have been approved. Authentication code is implemented; development-build setup and device verification remain pending. Shared-cart/checkout proposals below remain subject to their own approval. No website or database changes applied.

## Verified starting point

- Mobile: Expo ~57.0.26, React Native 0.86.3, TypeScript, Expo Router in src/app; npm/package-lock.json. Android starter confirmed by the user. No Supabase client installed yet.
- Website: C:\rollnspice, deployed at https://rollnspice.vercel.app. Existing Google OAuth, products, authenticated checkout, order history, and server-side Mailgun email.
- Sources checked: website AGENTS.md, TASKS.md, docs/DESIGN.md, docs/schema.md, src/hooks/useCart.js, src/lib/supabase/server.js, src/lib/orders/validate.js, src/app/api/orders/route.js; handoff in the Shawarma crave chat, “Review rules and plan first task”.
- Reuse the existing Supabase project hng-shop. No new backend project is needed. Current documented tables are products, orders, order_items; none stores a cart.
- Products are publicly readable under RLS; price is integer kobo. Private orders/items are owner-restricted. create_order is an atomic SECURITY INVOKER RPC; ownership comes from auth.uid() and prices come from products.
- Website cart currently persists locally in browser localStorage. It does not sync between devices.

## Existing order API and mobile gap

POST https://rollnspice.vercel.app/api/orders accepts items [{product_id, quantity}] and optional special_instructions (max 250 characters). It validates 1–100 unique product IDs and quantities 1–99; client identity/prices are discarded. Success is HTTP 201 with {order, email}; errors include 400, 401, 403, 409, 503.

The route currently verifies the user through a cookie-based Supabase server client and rejects foreign Origin headers. It has no bearer-token auth path. A native app session is therefore not ready to use this API unchanged.

Proposed website change: preserve browser cookie handling and add a separately verified Authorization: Bearer path for native clients. Pass that user's token to the RLS-protected RPC. Keep origin protections for browser requests, Mailgun on the server, and server-derived identity. Review retries/idempotency before enabling checkout: an unknown network result must not silently create a duplicate order.

## Proposed shared cart

- Guests: persist a local device cart containing product IDs and quantities. A signed-out guest has no cross-device cart; signing into the same account enables sharing.
- Signed in: Supabase is the authoritative cart. Proposed carts row keyed by user_id, revision, updated_at; cart_items keyed by (user_id, product_id) with quantity 1–99. Enable RLS on both and restrict all access to auth.uid(); index ownership/foreign keys. Schema and migrations belong in the website repository after approval.
- Mutations: transactional RPCs derive ownership from auth.uid(); use operation IDs for deduplication and revision checks for conflicting quantity changes. Enforce the existing 100-product maximum. Do not authorize from a supplied user_id.
- Guest sign-in merge: atomically add guest quantities to the account cart once, capped at 99 with visible feedback. Use a durable merge operation ID so a retry cannot add them twice. Clear the guest cart only after success; skip deleted products and explain any adjustments.
- Cross-device changes: subscribe to authorized cart changes, then refetch authoritative state. Refetch on app foreground/reconnect even if no event arrived. Enable Realtime for the approved tables only after checking access and publication settings.
- Offline: keep a local snapshot and account-scoped queue. Show pending sync; deduplicate retries. If an absolute quantity update conflicts, refresh and ask the user to resolve it rather than silently overwriting another device's update. Never show or sync one account's cart under another account.
- Sign-out: disconnect subscriptions and clear the visible account cart/session; retain pending work only scoped to its owner, never submit it as a different user. A new guest cart starts empty.
- Checkout: refresh products/prices and require authentication. Preserve the cart on failure. Clear only the purchased cart revision/items after confirmed success so additions from another device are not lost. Plan this transaction alongside checkout idempotency.

These behaviors are proposed, not implemented. “Instant” sync depends on connectivity; offline edits synchronize on reconnect.

## Design and security boundaries

Reuse the website's approved cream (#fff3de), charcoal (#211e1a), orange (#c93910), lime (#d2e344), rounded panels, food assets, and exact catalogue. Review native font loading separately; next/font is website-specific. Android first, safe areas, scrolling, accessible labels, at least 48-point touch targets, and clear loading/error/empty states.

Proposed mobile public configuration (not added): EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, EXPO_PUBLIC_API_URL. Never include Supabase secret/service-role keys or Mailgun settings in the app. Google sign-in must use approved mobile redirects and verified sessions; evaluate Expo Go limitations and use a development build when needed.

## First implementation task, after approval

1. Inspect the dependency audit and SDK compatibility without npm audit fix --force.
2. Configure Expo-compatible ESLint tooling if missing, with dependency approval.
3. Add a typecheck script and run lint/typecheck to establish a clean baseline.
4. Record results in TASKS.md; then propose the live read-only menu task before implementing it.

## Approved baseline task results (2026-10-02)

- User approved the baseline fix and dependency review. Broader feature implementation and backend changes remain subject to their own approval.
- Web hydration now uses React useSyncExternalStore server/client snapshots instead of setting state in an effect. Static HTML and initial hydration still use light mode; the mounted client follows useRNColorScheme. Native hook files were unchanged. Reference: https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering
- Added npm run typecheck. npm run lint and npm run typecheck pass. Online Expo install --check reports dependencies up to date.
- The initial sandbox audit returned an empty report; the online registry audit is the authoritative result: 16 affected packages, 12 moderate and 4 high. These counts include parent packages, not 16 distinct underlying advisories.
- node-forge 1.4.0 is used by Expo CLI/code-signing tooling. RSA signature verification advisory: https://github.com/advisories/GHSA-86w9-cpqp-85rv (no patched version listed at review time). This is a tooling chain; actual exploitability was not assessed.
- uuid 7.0.3 is used by xcode through Expo config plugins. Buffer bounds advisory: https://github.com/advisories/GHSA-w5hq-g745-h8pq. Any major override needs upstream compatibility review.
- decode-uri-component 0.2.2 is used by query-string 7.1.3 through expo-router 57.0.24. Malformed URI decoding denial-of-service advisory: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr. This chain warrants particular review before enabling external deep links.
- npm's proposed automatic fixes include Expo 44.0.6, expo-router 5.1.11 and expo-splash-screen 55.0.25; these break the selected SDK baseline. No forced fixes, downgrades, overrides or dependency upgrades were applied. Follow-up: investigate upstream SDK-compatible patches and validate any targeted remediation separately.

## Documentation references

## Targeted remediation review (2026-10-02)

Scope approved: review SDK-compatible dependency remediation. Registry checks found Expo 57.0.26 and Router 57.0.24 are the latest releases in their 57 lines. No package changes were applied during this review.

- node-forge: latest registry version remains 1.4.0, the affected installed version. No published patched version is available for a targeted upgrade.
- decode-uri-component: 0.5.0 is patched, but is an ES module with a default export. Installed query-string 7.1.3 uses require('decode-uri-component') and calls the result directly. A version-only override is not a compatible drop-in fix: Node may return a namespace object or reject the require, and Metro must also be checked. Prefer an upstream Router/query-string update or a reviewed compatible patch; do not override blindly. Package source: https://github.com/SamVerschueren/decode-uri-component/blob/v0.5.0/package.json
- uuid: 11.1.1 offers a CommonJS require entry and is a possible narrowly scoped override under xcode. Installed xcode uses uuid.v4() to generate project identifiers; the advisory names v3/v5/v6 with a supplied buffer. This reduces relevance to the observed call path, but is not a complete exploitability assessment. Validate project parsing/writing and Expo config/prebuild behavior before adopting an override. Latest uuid 14 is not the preferred candidate for this older CommonJS caller.
- Recommendation: retain the SDK-compatible baseline for now. Track unresolved findings before release, with priority on Router URI decoding before external auth/deep-link work and signing tooling before EAS signing. Any patch/override implementation requires its own short approved task and focused compatibility checks. The review is complete; vulnerability remediation is not complete.

## Documentation links

## Live menu implementation (2026-10-02)

- Added exact-pinned @supabase/supabase-js 2.117.2 and react-native-url-polyfill 4.0.0 through Expo install. No additional native modules required.
- Added EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to ignored .env.local by copying only the allowlisted public values from the website. Empty .env.example records their names. API URL is not needed for this step.
- src/lib/supabase.ts owns the singleton client. The approved sign-in task now enables native AsyncStorage persistence and foreground token refresh. Automatic URL detection stays disabled; validated PKCE callbacks are exchanged explicitly. README.md records development-build and redirect prerequisites.
- src/lib/products.ts uses the exact website select and ordering, with prices divided by 100 for naira display. src/hooks/use-products.ts handles request timeout, cleanup/cancellation, and retry. FlatList/product cards replace only the Home starter screen; full brand styling and other tabs remain future work.
- Public-key live query verified all six products/prices without a signed-in session. No private data or privileged credentials used and no data writes performed. User confirmed the live menu displays and works on their Android phone on 2026-10-02; the live-menu task is complete. Website brand styling is next. Device disconnect/retry testing remains part of end-to-end verification.
- Final validation: npm run lint and npm run typecheck pass; Android Metro/Hermes export succeeds after retrying the sandbox-blocked compiler with approval. .env.local is ignored by Git; source/template scan contains no secret/service-role or Mailgun references. The known 16 dependency audit findings remain unchanged.

## Further documentation

## Approved brand styling implementation (2026-10-02)

- Reused the website's approved cream/charcoal/orange/lime palette, exact hero copy, Anton headings, Inter body type, featured treatment, and food imagery. Light appearance is intentional to match the approved website design; app config records that choice.
- Fonts are bundled locally with their OFL licences and loaded through the existing expo-font package. Startup waits for font loading (or error) before hiding the splash; removed the animated Expo-logo overlay. Full native splash configuration takes effect in a future build, not through Expo Go alone.
- Converted existing website food assets to 800px WebP images for mobile: seven bundled images total approximately 457 KB versus roughly 15.7 MB of source PNGs. No photography generation or catalogue changes.
- Home uses a mobile hero, working Explore-the-menu scroll control, static brand strip, local decorative product photos, and accessible live-data/error states. About replaces the tutorial tab and links to the existing website. Native/web navigation labels use Home/About and the Roll N Spice brand.
- No cart buttons are displayed until adding-to-cart behavior is implemented. Product IDs, names, descriptions, prices, featured status and query ordering remain database-driven. Unknown product names still render without a mapped photo.
- User confirmed the Android visuals on 2026-10-02; the brand styling task is complete. iOS visual verification remains part of the later cross-platform task.
- Technical verification passed: npm run lint, npm run typecheck, Android Metro/Hermes export, and git diff --check. No new dependencies, backend changes, or data writes required for this styling task.

## Reference links

- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/llms.txt
- https://supabase.com/docs/guides/auth/quickstarts/react-native
- https://supabase.com/docs/guides/database/postgres/row-level-security

Recheck current versioned documentation before implementation. Website configuration/schema above is based on repository evidence, not a fresh production/database audit.
