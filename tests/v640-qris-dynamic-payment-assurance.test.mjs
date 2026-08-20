import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  QRIS_MAX_AMOUNT,
  calculateQrisCrc16,
  createDynamicQrisPayload,
  encodeQrisTlv,
  parseQrisTlvStrict,
  validateQrisPayload
} from '../src/utils/qrisDynamic.js';
import {
  QRIS_VERIFICATION_CONFIRMED,
  buildQrisAssuranceRecord,
  resolveQrisPresentation,
  sanitizePaymentForSale,
  validateQrisPaymentAmount
} from '../src/services/qrisPaymentAssurance.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// Dummy merchant payload from github.com/saquone/qris test fixture (MIT).
const STATIC_QRIS = '00020101021126650014COM.GO-JEK.WWW01189360091400000000000215000000000000000303UMI51440014ID.CO.QRIS.WWW0215ID10200000000000303UMI5204581253033605802ID5909TOKO DEMO6007JAKARTA61051234062070703A0163048748';

function addConvenienceFeeFields(payload) {
  const validation = validateQrisPayload(payload, { requireStatic: true });
  assert.equal(validation.valid, true);
  const rows = [];
  for (const element of validation.elements) {
    if (element.tag === '63') continue;
    if (element.tag === '58') {
      rows.push(encodeQrisTlv('55', '01'));
      rows.push(encodeQrisTlv('56', '10'));
    }
    rows.push(encodeQrisTlv(element.tag, element.value));
  }
  const prefix = `${rows.join('')}6304`;
  return `${prefix}${calculateQrisCrc16(prefix)}`;
}

test('v6.4.0 strict QRIS validator rejects malformed/trailing data and CRC tampering before conversion', () => {
  assert.equal(validateQrisPayload(STATIC_QRIS, { requireStatic: true }).valid, true);
  const tampered = STATIC_QRIS.replace('TOKO DEMO', 'ROKO DEMO');
  assert.equal(validateQrisPayload(tampered, { requireStatic: true }).valid, false);
  assert.match(validateQrisPayload(tampered, { requireStatic: true }).errors.join(' '), /CRC/i);
  assert.throws(() => parseQrisTlvStrict(`${STATIC_QRIS}99`), /terpotong|TLV/i);
  assert.throws(() => createDynamicQrisPayload(tampered, 50137), /CRC/i);
});

test('v6.4.0 local dynamic generator preserves merchant identity, embeds exact amount, strips fee tags, and recalculates CRC', () => {
  const withFees = addConvenienceFeeFields(STATIC_QRIS);
  const sourceValidation = validateQrisPayload(withFees, { requireStatic: true });
  assert.equal(sourceValidation.valid, true);
  assert.equal(sourceValidation.data.hasConvenienceFeeFields, true);

  const dynamic = createDynamicQrisPayload(withFees, 50137);
  const result = validateQrisPayload(dynamic);
  assert.equal(result.valid, true);
  assert.equal(result.data.method, '12');
  assert.equal(result.data.amount, 50137);
  assert.equal(result.data.merchantName, 'TOKO DEMO');
  assert.equal(result.data.merchantCity, 'JAKARTA');
  assert.equal(result.data.currency, '360');
  assert.equal(result.data.hasConvenienceFeeFields, false);
  assert.ok(result.data.merchantAccountTags.includes('26'));
  assert.ok(result.data.merchantAccountTags.includes('51'));
});

test('v6.4.0 enforces QRIS per-payment integer range Rp1 through Rp10,000,000', () => {
  assert.equal(validateQrisPaymentAmount(1), 1);
  assert.equal(validateQrisPaymentAmount(QRIS_MAX_AMOUNT), QRIS_MAX_AMOUNT);
  assert.throws(() => validateQrisPaymentAmount(0), /Rp1/);
  assert.throws(() => validateQrisPaymentAmount(QRIS_MAX_AMOUNT + 1), /split payment/i);
  assert.throws(() => validateQrisPaymentAmount(1000.5), /Rupiah bulat/i);
  assert.throws(() => validateQrisPaymentAmount('1e3'), /notasi ilmiah/i);
  assert.equal(validateQrisPaymentAmount('1000'), 1000);
});

test('v6.4.0 payment presentation is dynamic when enabled and degrades to static fallback without external converter API', () => {
  const payment = { id: 'PAY-1', methodId: 'qris', brand: 'qris', name: 'QRIS', amount: 125000 };
  const dynamic = resolveQrisPresentation(payment, {
    merchantName: 'TOKO DEMO', qrisPayload: STATIC_QRIS, qrisPayloadMeta: null,
    qrisDynamicEnabled: true, qrisDynamicAcknowledged: true, qrisRequireConfirmation: true,
    qrisImage: 'data:image/png;base64,AAAA'
  }, {});
  assert.equal(dynamic.mode, 'dynamic');
  assert.equal(validateQrisPayload(dynamic.payload).data.amount, 125000);

  const fallback = resolveQrisPresentation(payment, {
    merchantName: 'TOKO DEMO', qrisPayload: 'NOT-A-QRIS', qrisDynamicEnabled: true,
    qrisDynamicAcknowledged: true, qrisImage: 'data:image/png;base64,AAAA'
  }, {});
  assert.equal(fallback.mode, 'static-fallback');
  assert.match(fallback.warning, /dinamis tidak dapat dibuat/i);
});

test('v6.4.0 assurance audit records manual merchant confirmation without storing QR payload', () => {
  const payment = {
    id: 'PAY-1', methodId: 'qris', brand: 'qris', name: 'QRIS', amount: 99000,
    qrisSessionId: 'QRIS-SESSION-1', verification: QRIS_VERIFICATION_CONFIRMED,
    confirmedAt: '2026-08-20T12:00:00.000Z', confirmedBy: 'USR-1', confirmedByName: 'Kasir A', reference: 'BANK-APP-123'
  };
  const presentation = resolveQrisPresentation(payment, {
    merchantName: 'TOKO DEMO', qrisPayload: STATIC_QRIS, qrisDynamicEnabled: true, qrisDynamicAcknowledged: true
  }, {});
  const record = buildQrisAssuranceRecord({ ...payment, qrisRequireConfirmation: true }, presentation, { branchId: 'BR-1' });
  assert.equal(record.amount, 99000);
  assert.equal(record.mode, 'dynamic');
  assert.equal(record.payloadStored, false);
  assert.equal(record.verification.status, QRIS_VERIFICATION_CONFIRMED);
  assert.equal(record.verification.confirmedBy, 'USR-1');
  assert.equal(record.verification.reference, 'BANK-APP-123');
  assert.equal(Object.hasOwn(record, 'payload'), false);

  const sanitized = sanitizePaymentForSale({ ...payment, qrisRequireConfirmation: true }, presentation, { branchId: 'BR-1' });
  assert.equal(sanitized.qrisAssurance.payloadStored, false);
  assert.equal(Object.hasOwn(sanitized.qrisAssurance, 'payload'), false);
  assert.equal(Object.hasOwn(sanitized, 'qrisSessionId'), false);
});

test('v6.4.0 cashier, customer display, transaction audit, and completeSale all enforce Payment Assurance', async () => {
  const [pos, display, transactions, context, receipt] = await Promise.all([
    read('src/screens/POSScreen.jsx'),
    read('src/screens/DesktopCustomerDisplayScreen.jsx'),
    read('src/screens/TransactionsScreen.jsx'),
    read('src/store/PosContext.jsx'),
    read('src/services/receiptShare.js')
  ]);
  assert.match(pos, /QRIS Dinamis/);
  assert.match(pos, /Saya sudah melihat notifikasi pembayaran masuk ke merchant/);
  assert.match(pos, /checkoutId/);
  assert.match(pos, /sanitizePaymentForSale/);
  assert.match(display, /snapshot\.payment\.qrisPayload/);
  assert.match(display, /QrisCode/);
  assert.match(transactions, /Payment Assurance QRIS/);
  assert.match(context, /Metadata assurance QRIS tidak lengkap/);
  assert.match(context, /payloadStored !== false/);
  assert.match(receipt, /QRIS Dinamis/);
});

test('v6.4.0 intentionally excludes unofficial scraping and external QRIS conversion dependencies', async () => {
  const [packageJson, assurance, qrisCore] = await Promise.all([
    read('package.json'), read('src/services/qrisPaymentAssurance.js'), read('src/utils/qrisDynamic.js')
  ]);
  assert.doesNotMatch(packageJson, /puppeteer|playwright|payhook/i);
  assert.doesNotMatch(assurance, /miraipedia|gobiz|puppeteer|payhook/i);
  assert.doesNotMatch(qrisCore, /fetch\(|axios|https?:\/\//i);
});


test('v6.4.0 rejects duplicate root EMV tags instead of accepting ambiguous payloads', () => {
  const validation = validateQrisPayload(STATIC_QRIS, { requireStatic: true });
  assert.equal(validation.valid, true);
  const rows = validation.elements.filter(element => element.tag !== '63').map(element => encodeQrisTlv(element.tag, element.value));
  rows.splice(2, 0, encodeQrisTlv('52', '5812'));
  const prefix = `${rows.join('')}6304`;
  const duplicatePayload = `${prefix}${calculateQrisCrc16(prefix)}`;
  const duplicateValidation = validateQrisPayload(duplicatePayload, { requireStatic: true });
  assert.equal(duplicateValidation.valid, false);
  assert.match(duplicateValidation.errors.join(' '), /terduplikasi/i);
});

test('v6.4.0 Firestore rules and indexes persist dynamic QRIS profile fields safely on Spark', async () => {
  const [rules, indexes, workflow, diagnostics, settings, context] = await Promise.all([
    read('firestore.rules'), read('firestore.indexes.json'), read('.github/workflows/deploy-firebase.yml'),
    read('src/utils/syncDiagnostics.js'), read('src/screens/DeviceSettingsScreens.jsx'), read('src/store/PosContext.jsx')
  ]);
  assert.match(rules, /BUMI_MAKMUR_RULESET_VERSION=6\.4\.0/);
  for (const field of ['qrisPayload', 'qrisPayloadMeta', 'qrisDynamicEnabled', 'qrisDynamicAcknowledged', 'qrisRequireConfirmation']) {
    assert.match(rules, new RegExp(`'${field}'`));
  }
  assert.match(rules, /data\.qrisRequireConfirmation == true/);
  assert.match(indexes, /"collectionGroup": "branchPaymentProfiles"[\s\S]*"fieldPath": "qrisImage"[\s\S]*"indexes": \[\]/);
  assert.match(indexes, /"collectionGroup": "branchPaymentProfiles"[\s\S]*"fieldPath": "qrisPayload"[\s\S]*"indexes": \[\]/);
  assert.match(workflow, /BUMI_MAKMUR_RULESET_VERSION=6\.4\.0/);
  assert.match(diagnostics, /FIRESTORE_RULESET_VERSION = '6\.4\.0'/);
  assert.match(settings, /Konfirmasi notifikasi merchant wajib sebelum transaksi ditutup/);
  assert.match(context, /qrisRequireConfirmation: true/);
});

test('v6.4.0 completeSale binds QRIS confirmation to current cashier and branch', async () => {
  const context = await read('src/store/PosContext.jsx');
  assert.match(context, /Cabang assurance QRIS tidak cocok dengan cabang transaksi/);
  assert.match(context, /Konfirmasi QRIS harus dilakukan oleh kasir yang sedang login/);
  assert.match(context, /Session ID assurance QRIS tidak tersedia/);
  assert.match(context, /Waktu konfirmasi QRIS tidak valid/);
});
