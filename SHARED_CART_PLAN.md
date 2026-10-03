# Shared cart implementation plan

Prepared 2026-10-02 after approved inspection. Milestones 1 and 2 are complete: database foundation and shared checkout migrations applied to hng-shop; website integration verified with lint/build, 24 regression tests, local/live SQL and real two-session browser checks. Fixtures were removed. See C:/rollnspice/docs/shared-cart.md and docs/schema.md for the implemented contract. The user confirmed website deployment; mobile synchronization is implemented and user-confirmed on Android (2026-10-03), completing milestone 3.

## Verified baseline

- Website checkout and cart are implemented in C:/rollnspice. Working tree was clean at inspection.
- Website useCart uses localStorage (rollnspice-cart), storing IDs, names, prices and quantities. Browser tabs share storage events. It does not subscribe to authentication or a remote cart.
- Mobile cart stores product IDs and quantities locally. Both clients currently have independent carts, including when signed in.
- Existing Supabase project: hng-shop (kojdjmchgcqeqbnonruk), PostgreSQL 17.11. Public tables: products, orders, order_items, all with RLS enabled. No cart functions or Realtime publication tables exist.
- create_order derives identity from auth.uid(), validates quantities/products, and calculates prices transactionally. Website POST /api/orders uses cookie authentication. completeOrder currently subtracts submitted quantities only from the browser cart after HTTP success.

## Proposed sequence

### 1. Shared database foundation

- Prepare a migration and database tests in the website repository, using its existing supabase directory. Reuse the existing project and users.
- carts: user_id primary key, revision, updated_at. cart_items: owner/product composite key, quantity 1–99, foreign keys. Store no prices or customer profile data. Limit carts to 100 distinct products.
- cart_operations: owner/operation ID key with request identity and result for retry deduplication. Record successful mutations and guest merges durably; a reused operation ID with a different request must fail. Define retention before cleanup is introduced so offline retries cannot duplicate an old operation.
- RLS on every table, explicit grants, authenticated owner-only access, and database identity from auth.uid(). Anonymous users cannot access account carts. Enforce cart invariants at table level as well as through RPCs so direct Data API writes cannot bypass limits or revision handling. Prefer SECURITY INVOKER with a fixed search path; review any privilege-sensitive helper individually.
- Provide a coherent snapshot RPC and transactional add/decrement/remove/merge operations. Serialize changes for the same owner. Absolute quantity/removal operations use an expected revision and return a conflict instead of silently overwriting another device. Retry IDs are checked before revision conflicts.
- Guest merge adds quantities once, caps at 99, reports missing products/adjustments, and preserves local guest data until confirmed. Invalid payloads cannot partially change a cart.
- Enable Realtime for the owner-restricted cart revision row only. Clients use it as an invalidation signal and refetch the coherent snapshot; realtime payloads do not become the source of truth.
- Verify guest denial, cross-user isolation, valid/invalid edits, limits, duplicate retries, conflicting revisions, missing products, and merge adjustments. Run database advisors. Keep applied SQL and repository migration/schema records aligned.

### 2. Website integration

- Keep signed-out browser carts local. Restore the existing guest cart without losing it; migrate its IDs/quantities using live product metadata.
- On sign-in, restore the account cart and merge guest items once with a durable operation ID. Surface capped quantities and unavailable items. Do not clear the guest cart before acknowledgement.
- Use an account-scoped state/queue, show sync status, refetch on foreground/reconnect, and subscribe to revision changes. Handle conflicting absolute changes explicitly. Late responses from a previous account must never update the visible cart.
- On sign-out, hide the account cart and start an empty guest cart. Preserve pending requests only under their original owner; never resend them as a different account.
- Preserve drawer layout, keyboard focus, decrement-at-one removal and quantity badges. Use current product prices, not persisted prices.
- Coordinate shared-cart checkout before enabling shared carts for website ordering: introduce a transaction that creates the order from a checked cart revision and clears only those purchased items, with an order operation ID to avoid duplicate retries. A revision conflict requires review of the refreshed cart. Replayed orders must not send duplicate confirmation emails. Keep existing server-only Mailgun and ownership checks.
- Run website lint/build, cart/order regression tests, and real browser verification against Supabase. Prepare a reviewable change before deployment; do not publish solely because local tests pass.

### 3. Mobile integration (separate approved task)

- Consume the same snapshot/mutation/merge contract, using the existing Supabase client.
- Add account-scoped durable pending operations, guest merge, reconnect/foreground refetch, and revision subscription cleanup.
- Verify website/mobile changes under the same account, different-account isolation, offline retry, conflict feedback, merge replay, sign-out, and session restoration on Android. Verify iOS later.
- Mobile checkout remains a later task; its bearer-authenticated order API path needs its own review.

## Acceptance examples

- Add two rolls on the website: the signed-in mobile cart shows two after mobile synchronization is implemented.
- Guest has one roll, account has two: sign-in yields three; repeating a failed merge request still yields three.
- One device changes a quantity while another holds an old revision: the stale absolute change gets a conflict and refreshed cart, rather than overwriting the first change.
- Sign out and use a different account: the previous account's cart/pending work never appears or gets submitted under the new identity.
- Place an order while another device adds an item: either checkout rejects the stale revision or preserves the later addition; it never clears the entire cart blindly.

## Next approval boundary

Milestones 1 and 2 are complete; the user confirmed website deployment. Milestone 3 is complete: implemented, technically verified and user-confirmed on Android (2026-10-03). No application dependency or environment variable was added. Native signed-in carts now consume the shared backend; guests keep device storage. The authenticated mobile order API is deployed and user-verified. Mobile checkout and own-order history are implemented, technically verified and user-confirmed on Android. See MOBILE_PLAN.md and TASKS.md.
