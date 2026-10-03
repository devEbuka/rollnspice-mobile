const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const loaded = new Map();
function load(name) {
  const file = path.resolve(__dirname, '../src/lib', name + '.ts');
  if (loaded.has(file)) return loaded.get(file);
  const exports = {}; loaded.set(file, exports);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, require: (relative) => load(path.basename(relative)), Promise, Map, Set, JSON, Error });
  return exports;
}
const { SyncedCartStore } = load('cart-sync-store');
const { CART_KEY } = load('cart-store');
const { accountKey, CLAIM_KEY } = load('cart-sync-data');
const id = '11111111-1111-4111-8111-111111111111';
class Storage {
  values = new Map(); fail = false;
  async getItem(key) { return this.values.get(key) ?? null; }
  async setItem(key, value) { if (this.fail) throw new Error('Storage full'); this.values.set(key, value); }
  async removeItem(key) { this.values.delete(key); }
}
function fixture() {
  const storage = new Storage(); const accounts = new Map(); const receipts = new Map(); const calls = [];
  let offline = false; let lose = false;
  const snapshot = (owner) => accounts.get(owner) ?? { revision: 0, items: [] };
  const rpc = async (name, args, owner) => {
    calls.push({ name, owner, args });
    if (offline) return { error: { message: 'Offline' } };
    if (name === 'get_cart') return { data: snapshot(owner) };
    const receiptKey = owner + args.p_operation_id;
    if (receipts.has(receiptKey)) return { data: { ...receipts.get(receiptKey), replayed: true } };
    const data = snapshot(owner);
    if (args.p_expected_revision != null && args.p_expected_revision !== data.revision) return { error: { message: 'CART_CONFLICT', code: 'PT409' } };
    const lines = new Map(data.items.map(p => [p.product_id,p.quantity]));
    for (const line of args.p_items) {
      const old = lines.get(line.product_id) ?? 0;
      const next = args.p_action === 'remove' ? 0 : args.p_action === 'decrement' ? Math.max(0,old-line.quantity) : Math.min(99,old+line.quantity);
      if (next) lines.set(line.product_id,next); else lines.delete(line.product_id);
    }
    const result = {revision:data.revision+1,items:[...lines].map(([product_id,quantity])=>({product_id,quantity})),adjustments:[],replayed:false};
    accounts.set(owner,result); receipts.set(receiptKey,result);
    if (lose) { lose=false; return {error:{message:'Reply lost'}}; }
    return {data:result};
  };
  return {storage,rpc,calls,receipts,snapshot,create:()=>new SyncedCartStore(storage,rpc,randomUUID),offline:v=>{offline=v;},lose:()=>{lose=true;}};
}
test('guest merge survives lost acknowledgement and restart without duplication', async()=>{
  const f=fixture(); await f.storage.setItem(CART_KEY,JSON.stringify({version:1,lines:[{productId:id,quantity:2}]})); f.lose();
  await f.create().identify('one'); assert.equal(f.snapshot('one').items[0].quantity,2);
  assert.ok(await f.storage.getItem(CLAIM_KEY));
  const restored=f.create(); await restored.identify('one');
  assert.equal(restored.getSnapshot().lines[0].quantity,2); assert.equal(restored.getSnapshot().pending,0); assert.equal(f.receipts.size,1);
  assert.equal(await f.storage.getItem(CLAIM_KEY),null); assert.equal(JSON.parse(await f.storage.getItem(CART_KEY)).lines.length,0);
});
test('offline edits survive restart and drain in order when reconnected',async()=>{
  const f=fixture(); const store=f.create(); await store.identify('one'); f.offline(true);
  await store.edit('add',id); await store.edit('add',id); await store.refresh();
  assert.equal(store.getSnapshot().pending,2); assert.equal(store.getSnapshot().lines[0].quantity,2);
  const restored=f.create(); await restored.identify('one'); assert.equal(restored.getSnapshot().pending,2);
  f.offline(false); await restored.refresh(); assert.equal(restored.getSnapshot().pending,0); assert.equal(f.snapshot('one').items[0].quantity,2);
});
test('rapid taps persist every relative addition and decrement at one removes',async()=>{
  const f=fixture(); const store=f.create(); await store.identify('one');
  await Promise.all([store.edit('add',id),store.edit('add',id),store.edit('add',id)]); await store.refresh();
  assert.equal(f.snapshot('one').items[0].quantity,3);
  for(let n=0;n<3;n++){await store.edit('decrement',id);await store.refresh();}
  assert.equal(store.getSnapshot().lines.length,0);
});
test('old account pending edits never submit under another account',async()=>{
  const f=fixture(); const store=f.create(); await store.identify('one'); f.offline(true);
  await store.edit('add',id); await store.refresh(); await store.identify(null);
  assert.equal(store.getSnapshot().lines.length,0); f.offline(false); await store.identify('two');
  assert.equal(store.getSnapshot().lines.length,0); assert.equal(f.snapshot('two').items.length,0);
  assert.equal(JSON.parse(await f.storage.getItem(accountKey('one'))).queue.length,1);
  await store.identify('one'); assert.equal(f.snapshot('one').items[0].quantity,1);
});
test('stale whole-item removal refreshes rather than overwriting a remote edit',async()=>{
  const f=fixture(); const store=f.create(); await store.identify('one'); await store.edit('add',id); await store.refresh();
  f.offline(true); await store.edit('remove',id); await store.refresh(); f.offline(false);
  await f.rpc('mutate_cart',{p_operation_id:randomUUID(),p_action:'add',p_items:[{product_id:id,quantity:1}]},'one');
  await store.refresh(); assert.equal(store.getSnapshot().lines[0].quantity,2); assert.match(store.getSnapshot().message,/changed elsewhere/);
});
test('storage failure rejects an unsaved account edit before sending it',async()=>{
  const f=fixture(); const store=f.create(); await store.identify('one'); f.storage.fail=true;
  await store.edit('add',id); assert.equal(store.getSnapshot().lines.length,0); assert.equal(f.receipts.size,0); assert.ok(store.getSnapshot().error);
});
test('guest claim recovers when account queue write fails',async()=>{
  const f=fixture(); await f.storage.setItem(CART_KEY,JSON.stringify({version:1,lines:[{productId:id,quantity:1}]}));
  const set=f.storage.setItem.bind(f.storage); f.storage.setItem=async(k,v)=>{if(k===accountKey('one'))throw new Error('write failed');return set(k,v);};
  await f.create().identify('one'); assert.ok(await f.storage.getItem(CLAIM_KEY)); assert.equal(f.receipts.size,0);
  f.storage.setItem=set; const restored=f.create(); await restored.identify('one'); assert.equal(f.snapshot('one').items[0].quantity,1);
});
test('late old-account responses cannot change the new visible cart',async()=>{
  const f=fixture(); let release; const blocked=new Promise(resolve=>{release=resolve;}); let hold=false;
  const store=new SyncedCartStore(f.storage,async(name,args,owner)=>owner==='one'&&hold?blocked:f.rpc(name,args,owner),randomUUID);
  await store.identify('one'); hold=true; const refresh=store.refresh(); await store.identify('two');
  release({data:{revision:9,items:[{product_id:id,quantity:99}]}}); await refresh;
  assert.equal(store.getSnapshot().owner,'two'); assert.equal(store.getSnapshot().lines.length,0);
});
test('checkout snapshot refuses unsynced, empty or different-owner carts',async()=>{
  const f=fixture(); const store=f.create(); await store.identify('one');
  await assert.rejects(store.checkoutSnapshot('one'));
  await store.edit('add',id); await store.refresh();
  const review=await store.checkoutSnapshot('one'); assert.equal(review.lines[0].quantity,1); assert.equal(review.revision,f.snapshot('one').revision);
  f.offline(true); await store.edit('add',id); await store.refresh(); await assert.rejects(store.checkoutSnapshot('one'));
  await assert.rejects(store.checkoutSnapshot('two'));
});
