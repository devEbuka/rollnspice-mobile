const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/lib/cart-store.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const exportsObject = {};
vm.runInNewContext(compiled.outputText, { exports: exportsObject });
const { CartStore, restoreCart, cartTotal } = exportsObject;
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const payload = (lines) => JSON.stringify({ version: 1, lines });

test('restores IDs and quantities, ignoring stored prices', () => {
  const lines = restoreCart(payload([{ productId: id, quantity: 2, price: 1 }]));
  assert.equal(lines[0].quantity, 2);
  assert.equal(lines[0].price, undefined);
  assert.equal(cartTotal(lines, [{ id, price: 50000 }]), 100000);
});
test('excludes unavailable products and invalid prices from totals', () => {
  assert.equal(cartTotal([{ productId: id, quantity: 2 }, { productId: other, quantity: 4 }], [{ id, price: 100 }]), 200);
  assert.equal(cartTotal([{ productId: id, quantity: 2 }], [{ id, price: -10 }]), 0);
});
test('rejects corrupt, duplicate, invalid-ID, and out-of-range saved data', () => {
  for (const raw of ['bad', 'null', payload([{ productId: 'bad', quantity: 1 }]), payload([{ productId: id, quantity: 0 }]), payload([{ productId: id, quantity: 100 }]), payload([{ productId: id, quantity: 1.5 }]), payload([{ productId: id, quantity: 1 }, { productId: id, quantity: 2 }])]) assert.throws(() => restoreCart(raw));
});
test('blocks edits before restoration and serializes rapid saves', async () => {
  let saved = payload([{ productId: id, quantity: 2 }]);
  const writes = [];
  const store = new CartStore({ getItem: async () => saved, setItem: async (_, value) => { await new Promise(r => setTimeout(r, 2)); saved = value; writes.push(value); } });
  store.setQuantity(id, 1);
  assert.equal(store.getSnapshot().lines.length, 0);
  await store.initialize();
  store.setQuantity(id, 3); store.setQuantity(id, 4); store.setQuantity(other, 1); store.setQuantity(other, 0);
  await store.save();
  assert.equal(restoreCart(saved)[0].quantity, 4);
  assert.equal(restoreCart(saved).length, 1);
  assert.equal(writes.length, 5);
  const restarted = new CartStore({ getItem: async () => saved, setItem: async () => {} });
  await restarted.initialize();
  assert.equal(restarted.getSnapshot().lines[0].quantity, 4);
});
test('read failure preserves storage and can retry', async () => {
  let fail = true; let writes = 0;
  const store = new CartStore({ getItem: async () => { if (fail) throw Error(); return payload([{ productId: id, quantity: 5 }]); }, setItem: async () => { writes++; } });
  await store.initialize(); store.setQuantity(id, 1);
  assert.equal(store.getSnapshot().ready, false); assert.equal(writes, 0);
  fail = false; await store.save();
  assert.equal(store.getSnapshot().lines[0].quantity, 5);
});
test('save failures retain in-memory changes and recover on retry', async () => {
  let fail = true; let saved;
  const store = new CartStore({ getItem: async () => null, setItem: async (_, value) => { if (fail) throw Error(); saved = value; } });
  await store.initialize(); store.setQuantity(id, 3); await store.save();
  assert.ok(store.getSnapshot().error); assert.equal(store.getSnapshot().lines[0].quantity, 3);
  fail = false; await store.save();
  assert.equal(store.getSnapshot().error, ''); assert.equal(restoreCart(saved)[0].quantity, 3);
});
test('decrementing the last unit removes that item and persists the remaining cart', async () => {
  let saved;
  const store = new CartStore({ getItem: async () => payload([{ productId: id, quantity: 1 }, { productId: other, quantity: 2 }]), setItem: async (_, value) => { saved = value; } });
  await store.initialize();
  const line = store.getSnapshot().lines.find(item => item.productId === id);
  store.setQuantity(id, line.quantity - 1);
  await store.save();
  const restored = restoreCart(saved);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].productId, other);
  assert.equal(restored[0].quantity, 2);
});
test('invalid mutations cannot change or erase an existing cart', async () => {
  const store = new CartStore({ getItem: async () => payload([{ productId: id, quantity: 2 }]), setItem: async () => {} });
  await store.initialize();
  for (const quantity of [-1, 100, 1.5, NaN]) store.setQuantity(id, quantity);
  store.setQuantity('bad', 1);
  assert.equal(store.getSnapshot().lines.length, 1); assert.equal(store.getSnapshot().lines[0].quantity, 2);
  store.setQuantity(id, 0); assert.equal(store.getSnapshot().lines.length, 0);
});
