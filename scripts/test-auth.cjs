const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const test = require('node:test');

// Exercise the actual parser without importing React Native in Node.
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/lib/auth-callback.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const moduleExports = {};
vm.runInNewContext(compiled.outputText, { exports: moduleExports, URL, Error });
const parse = moduleExports.parseAuthCallback;
const valid = 'rollnspicemobile://explore?code=test-code&sb_flow_id=abcdefgh1234';

test('accepts the exact native return URL and preserves PKCE flow ID', () => {
  const result = parse(valid);
  assert.equal(result.code, 'test-code');
  assert.equal(result.flowId, 'abcdefgh1234');
});
for (const [name, url] of [
  ['foreign scheme', valid.replace('rollnspicemobile:', 'https:')],
  ['foreign host', valid.replace('//explore', '//attacker')],
  ['extra path', valid.replace('explore?', 'explore/other?')],
  ['implicit access token', 'rollnspicemobile://explore#access_token=untrusted'],
  ['provider denial', valid + '&error=access_denied'],
  ['missing verifier flow', 'rollnspicemobile://explore?code=test-code'],
  ['invalid flow', valid.replace('abcdefgh1234', '..bad..')],
  ['duplicate code', valid + '&code=second'],
  ['duplicate flow', valid + '&sb_flow_id=ijklmnop'],
  ['oversized callback', valid + '&padding=' + 'x'.repeat(8192)],
]) {
  test(`rejects ${name}`, () => assert.throws(() => parse(url)));
}
