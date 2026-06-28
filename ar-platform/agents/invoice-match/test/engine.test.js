// Unit tests — run with: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchPayment, loadConfig } from '../src/index.js';
import { normRef, lev } from '../src/engine.js';

const DEF = loadConfig('default');
const inv = (id, doc, amt, extra = {}) => ({ id, doc_number: doc, customer_id: 'CUST-1', open_amount: amt, currency: 'USD', ...extra });
const pay = (amount, references = [], extra = {}) => ({ payment: { id: 'P', amount, currency: 'USD', customer_id: 'CUST-1', value_date: '2026-06-20', references, ...extra } });

test('normRef strips punctuation and leading zeros', () => {
  assert.equal(normRef('00-900.123'), '900123');
  assert.equal(normRef('90012345'), '90012345');
});

test('levenshtein', () => { assert.equal(lev('90012999', '90012998'), 1); assert.equal(lev('abc', 'abc'), 0); });

test('exact single match auto-posts', () => {
  const r = matchPayment({ ...pay(480000, ['90012345']), open_invoices: [inv('INV1', '90012345', 480000)] }, DEF);
  assert.equal(r.status, 'matched'); assert.equal(r.layer, 'exact');
  assert.deepEqual(r.matched_invoices, ['INV1']); assert.equal(r.auto_post, true);
});

test('leading-zero reference still matches', () => {
  const r = matchPayment({ ...pay(360000, ['0090012346']), open_invoices: [inv('INV2', '90012346', 360000)] }, DEF);
  assert.equal(r.status, 'matched'); assert.deepEqual(r.matched_invoices, ['INV2']);
});

test('fuzzy reference (off-by-one) matches at reference layer', () => {
  const r = matchPayment({ ...pay(120000, ['90012999']), open_invoices: [inv('INV3', '90012998', 120000)] }, DEF);
  assert.equal(r.layer, 'reference'); assert.deepEqual(r.matched_invoices, ['INV3']);
});

test('split across two invoices', () => {
  const r = matchPayment({ ...pay(165000), open_invoices: [inv('A', '1', 120000), inv('B', '2', 45000)] }, DEF);
  assert.equal(r.layer, 'split'); assert.deepEqual(r.matched_invoices.sort(), ['A', 'B']);
});

test('short-pay within band flags a deduction', () => {
  const r = matchPayment({ ...pay(456000, ['90014000']), open_invoices: [inv('INV12', '90014000', 480000)] }, DEF);
  assert.equal(r.status, 'partial'); assert.equal(r.short_pay, true); assert.equal(r.deduction, 24000);
});

test('no confident match → exception', () => {
  const r = matchPayment({ ...pay(99999, ['NOPE']), open_invoices: [inv('X', '90015000', 200000)] }, DEF);
  assert.equal(r.status, 'exception'); assert.deepEqual(r.matched_invoices, []);
});

test('CONFIG SENSITIVITY — same payment, matched under default, exception under tighter client-b', () => {
  const req = { ...pay(86000), open_invoices: [inv('INV5', '90013002', 85500)] };
  assert.equal(matchPayment(req, loadConfig('default')).status, 'matched');     // 0.58% within 2%
  assert.equal(matchPayment(req, loadConfig('client-b')).status, 'exception');  // 0.58% outside 0.5%
});

test('contract validation rejects malformed input', () => {
  assert.throws(() => matchPayment({ payment: { id: 'P' }, open_invoices: [] }, DEF), /contract validation failed/);
});
