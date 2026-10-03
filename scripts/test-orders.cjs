const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const { randomUUID } = require('node:crypto');
let session, fetcher; const loaded = new Map();
function load(name) {
  if (name === 'supabase') return { getSupabase: () => ({ auth: { getSession: async () => ({ data: { session }, error: null }) } }) };
  if (loaded.has(name)) return loaded.get(name);
  const exports = {}; loaded.set(name, exports);
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib', name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, require: (relative) => load(path.basename(relative)), Promise, Map, Set, JSON, Error, Date, AbortController, setTimeout, clearTimeout, fetch: (...args) => fetcher(...args) });
  return exports;
}
const { CheckoutStore } = load('checkout-store');
const { checkoutKey, orderPage } = load('order-data');
const { orderRequest, loadOrders } = load('order-api');
const owner = randomUUID(); const id = randomUUID();
const result = { order: { id, subtotal: 450000, status: 'pending' }, email: { status: 'unavailable' }, replayed: false };
class Storage {
  values = new Map(); fail = false; readsFail = false;
  async getItem(key) { if (this.readsFail) throw new Error('read failed'); return this.values.get(key) ?? null; }
  async setItem(key, value) { if (this.fail) throw new Error('write failed'); this.values.set(key, value); }
  async removeItem(key) { this.values.delete(key); }
}
function fixture() {
  const storage = new Storage(), calls = [], receipts = new Map(); let lost = false;
  const transport = async (who, method, body) => {
    calls.push({ who, method, body });
    assert.ok(await storage.getItem(checkoutKey(who)), 'request persisted before send');
    const key = who + body.cart_operation_id;
    const replayed = receipts.has(key); if (!replayed) receipts.set(key, result);
    if (lost) { lost = false; throw new Error('reply lost'); }
    return { status: 201, body: { ...result, replayed } };
  };
  return { storage, calls, receipts, lose: () => { lost = true; }, create: (api = transport) => new CheckoutStore(storage, api, randomUUID) };
}
test('unknown checkout reply survives restart and recovers exactly one order', async () => {
  const f = fixture(); const a = f.create(); await a.identify(owner); f.lose(); await a.submit(owner, 7, 'no onions');
  const original = a.getSnapshot().request; assert.ok(original); assert.equal(f.receipts.size, 1);
  const b = f.create(); await b.identify(owner); await b.submit(owner, 99, 'changed instructions');
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls[1].body)), JSON.parse(JSON.stringify(original)));
  assert.equal(f.receipts.size, 1); assert.equal(b.getSnapshot().confirmation.replayed, true); assert.equal(b.getSnapshot().request, null);
});
test('rapid repeated submit creates one request and saved confirmation blocks a new order', async () => {
  const f = fixture(); const store = f.create(); await store.identify(owner);
  await Promise.all([store.submit(owner, 1, ''), store.submit(owner, 1, '')]);
  assert.equal(f.calls.length, 1); await store.submit(owner, 2, ''); assert.equal(f.calls.length, 1);
  const restored = f.create(); await restored.identify(owner); assert.equal(restored.getSnapshot().confirmation.order.id, id);
  await restored.startNew(); await restored.submit(owner, 2, ''); assert.equal(f.calls.length, 2);
});
test('storage failure prevents sending an unsaved order', async () => {
  const f = fixture(); const store = f.create(); await store.identify(owner); f.storage.fail = true;
  await store.submit(owner, 1, ''); assert.equal(f.calls.length, 0); assert.equal(store.getSnapshot().request, null); assert.ok(store.getSnapshot().error);
});
test('successful order with failed confirmation save retains its original retry ID', async () => {
  const f = fixture(); const store = f.create(async () => { f.storage.fail = true; return { status: 201, body: result }; });
  await store.identify(owner); await store.submit(owner, 1, '');
  const original = store.getSnapshot().request.cart_operation_id; assert.equal(store.getSnapshot().confirmation.order.id, id);
  f.storage.fail = false; const restored = f.create(); await restored.identify(owner); assert.equal(restored.getSnapshot().request.cart_operation_id, original);
  await restored.submit(owner, 9, 'other'); assert.equal(restored.getSnapshot().request, null); assert.equal(f.calls[0].body.cart_operation_id, original);
});
test('sign-out isolates unresolved checkout and the original owner can restore it', async () => {
  const f = fixture(); const store = f.create(); await store.identify(owner); f.lose(); await store.submit(owner, 1, '');
  const original = store.getSnapshot().request.cart_operation_id;
  await store.identify(null); assert.equal(store.getSnapshot().request, null);
  await store.identify(randomUUID()); assert.equal(store.getSnapshot().request, null); assert.equal(store.getSnapshot().confirmation, null);
  await store.submit(owner, 1, ''); assert.equal(f.calls.length, 1);
  await store.identify(owner); assert.equal(store.getSnapshot().request.cart_operation_id, original);
});
test('late success from an old account cannot enter the new account view', async () => {
  const f = fixture(); let release, called = false;
  const blocked = new Promise(resolve => { release = resolve; });
  const store = f.create(async () => { called = true; await blocked; return { status: 201, body: result }; });
  await store.identify(owner); const pending = store.submit(owner, 1, '');
  while (!called) await Promise.resolve();
  const next = randomUUID(); await store.identify(next); release(); await pending;
  assert.equal(store.getSnapshot().owner, next); assert.equal(store.getSnapshot().confirmation, null);
  await store.identify(owner); assert.ok(store.getSnapshot().request);
});
test('conflicts clear only the rejected request; authentication and uncertain failures retain it', async () => {
  for (const status of [400, 403, 409, 401, 429, 503]) {
    const f = fixture(); const store = f.create(async () => ({ status, body: { error: 'rejected' } }));
    await store.identify(owner); await store.submit(owner, 1, '');
    assert.equal(Boolean(store.getSnapshot().request), ![400, 403, 409].includes(status));
    assert.equal(store.getSnapshot().conflict, status === 409); assert.ok(store.getSnapshot().error);
  }
});
test('invalid success reply, corrupt storage and failed reads do not start a replacement order', async () => {
  const f = fixture(); const store = f.create(async () => ({ status: 201, body: { order: { subtotal: 1 } } }));
  await store.identify(owner); await store.submit(owner, 1, ''); assert.ok(store.getSnapshot().request);
  await f.storage.setItem(checkoutKey(owner), '{broken'); const corrupt = f.create(); await corrupt.identify(owner);
  await corrupt.submit(owner, 1, ''); assert.equal(corrupt.getSnapshot().ready, false); assert.equal(f.calls.length, 0);
  f.storage.readsFail = true; await corrupt.identify(owner); assert.equal(corrupt.getSnapshot().ready, false);
});
test('mobile transport pins the selected token and rejects mismatched accounts', async () => {
  session = { user: { id: owner }, access_token: 'original-token' }; let captured;
  fetcher = async (url, options) => { captured = { url, options }; session = { user: { id: randomUUID() }, access_token: 'other-token' }; return { status: 201, json: async () => result }; };
  const body = { cart_operation_id: randomUUID(), cart_revision: 1, special_instructions: '' };
  await orderRequest(owner, 'POST', body);
  assert.equal(captured.options.headers.Authorization, 'Bearer original-token'); assert.equal(captured.options.headers['X-Cart-Account'], owner);
  assert.equal(captured.options.body, JSON.stringify(body)); assert.ok(captured.options.signal);
  captured = null; await assert.rejects(orderRequest(owner, 'POST', body)); assert.equal(captured, null);
});
test('history validates saved prices and pages; errors never present another account data', async () => {
  const page = { page: 1, hasNext: false, orders: [{ ...result.order, created_at: '2026-10-03T10:00:00', special_instructions: null, order_items: [{ id: randomUUID(), quantity: 2, unit_price: 225000, products: { name: 'Saved item' } }] }] };
  assert.equal(orderPage(page).orders[0].order_items[0].unit_price, 225000);
  assert.throws(() => orderPage({ ...page, orders: [{ ...page.orders[0], subtotal: -1 }] }));
  session = { user: { id: owner }, access_token: 'token' };
  fetcher = async () => ({ status: 200, json: async () => page }); assert.equal((await loadOrders(owner, 1)).orders.length, 1);
  await assert.rejects(loadOrders(owner, 2));
  fetcher = async () => ({ status: 401, json: async () => ({}) }); await assert.rejects(loadOrders(owner, 1), /Sign in again/);
});
