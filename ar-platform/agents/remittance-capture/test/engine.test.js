// Unit tests — node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capture, loadConfig } from '../src/index.js';
import { parse } from '../src/engine.js';

const DEF = loadConfig('default');

test('email multi-invoice parses, reconciles', () => {
  const r = parse('Payment of USD 165,000.00 covering:\nInvoice 90013100 120,000.00\nInvoice 90013101 45,000.00\nRemitter: MD Anderson Cancer Center\nvalue date 2026-06-25', 'email');
  assert.equal(r.payment.amount, 165000);
  assert.deepEqual(r.payment.references.sort(), ['90013100', '90013101']);
  assert.equal(r.payment.remittance_lines.length, 2);
  assert.equal(r.reconciled, true);
  assert.equal(r.payer.name, 'MD Anderson Cancer Center');
  assert.equal(r.payment.value_date, '2026-06-25');
});

test('lockbox CSV parses', () => {
  const r = parse('invoice,amount,value_date\n90014000,456000.00,2026-06-20', 'lockbox');
  assert.equal(r.payment.amount, 456000);
  assert.deepEqual(r.payment.references, ['90014000']);
  assert.equal(r.payment.remittance_lines.length, 1);
});

test('EDI 820 RMR + TRN parses', () => {
  const r = parse('ST*820*0001~TRN*1*165000.00~RMR*IV*90016001**120000.00~RMR*IV*90016002**45000.00~', 'edi');
  assert.equal(r.source_channel, 'edi');
  assert.equal(r.payment.amount, 165000);
  assert.deepEqual(r.payment.references.sort(), ['90016001', '90016002']);
});

test('garbled text → low confidence, needs review', async () => {
  const r = await capture({ text: 'Hi team, we sent some funds earlier. Thanks!' }, DEF);
  assert.equal(r.payment.amount, null);
  assert.deepEqual(r.payment.references, []);
  assert.ok(r.confidence < 0.6);
  assert.equal(r.needs_review, true);
});

test('capture returns meta (agent, provider, version)', async () => {
  const r = await capture({ text: 'invoice 90012345 $480,000.00' }, DEF);
  assert.equal(r.meta.agent, '@tiger/o2c-remittance-capture');
  assert.equal(r.meta.provider, 'text');
  assert.ok(r.meta.version);
});

test('docintel provider without credentials throws PROVIDER (port is real, key absent)', async () => {
  await assert.rejects(() => capture({ provider: 'docintel', document: { bytes_base64: 'AAAA' } }, DEF), /not configured/);
});

test('contract validation rejects empty text', async () => {
  await assert.rejects(() => capture({ text: '' }, DEF), /contract validation failed/);
});
