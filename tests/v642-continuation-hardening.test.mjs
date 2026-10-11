import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { remainingSaleLineQty } from '../src/utils/saleLines.js';
import { assertUniqueQrisSessions } from '../src/utils/qrisSessionGuard.js';
import { createApprovalTickets } from '../src/utils/approvalTickets.js';
import { csvCell } from '../src/utils/csvExport.js';
import { parseInventoryFile } from '../src/utils/inventoryImport.js';

const qris = (sessionId, methodId = 'qris') => ({ methodId, qrisAssurance: { sessionId } });

test('refund modal tidak mencampurkan baris dengan productId sama', () => {
  const first = { lineId: 'LINE-A', productId: 'P1', qty: 2 };
  const second = { lineId: 'LINE-B', productId: 'P1', qty: 1 };
  const previous = [{ saleId: 'INV-1', items: [{ lineId: 'LINE-A', productId: 'P1', qty: 2 }] }];
  assert.equal(remainingSaleLineQty(first, previous), 0);
  assert.equal(remainingSaleLineQty(second, previous), 1);
  assert.equal(remainingSaleLineQty({ productId: 'P9', qty: 3 }, [{items:[{productId:'P9',qty:1}]}]), 2);
  const source = fs.readFileSync(new URL('../src/screens/TransactionsScreen.jsx', import.meta.url), 'utf8');
  assert.match(source, /remainingSaleLineQty\(line, refunds\)/);
  assert.doesNotMatch(source, /item\.lineId === line\.lineId \|\| item\.productId === line\.productId/);
});

test('QRIS menolak dua pembayaran dengan sesi yang sama dalam satu checkout', () => {
  assert.throws(() => assertUniqueQrisSessions([qris('Q-1'), qris('Q-1')], []), /duplikat dalam transaksi/);
  assert.throws(() => assertUniqueQrisSessions([qris('Q-1')], [{ payments: [qris('Q-1')] }]), /sudah dipakai/);
  assert.throws(() => assertUniqueQrisSessions([qris('')], []), /tidak tersedia/);
  assert.doesNotThrow(() => assertUniqueQrisSessions([qris('Q-1'), qris('Q-2')], []));
  assert.doesNotThrow(() => assertUniqueQrisSessions([{ methodId: 'cash', amount: 10 }], []));
});

test('tiket persetujuan harus cocok pengguna/tujuan, belum kedaluwarsa, sekali pakai', () => {
  let clock = 1000;
  let index = 0;
  const approvals = createApprovalTickets({ now: () => clock, generate: () => `LOCAL-TICKET-${++index}` });
  const ticket = approvals.issue({ userId: 'OWNER-1', purpose: 'SALE_DISCOUNT' });
  const input = { token: ticket, userId: 'OWNER-1', purpose: 'SALE_DISCOUNT' };
  assert.equal(approvals.isValid(input), true);
  assert.equal(approvals.isValid({ ...input, purpose: 'SALE_BELOW_COST' }), false);
  assert.equal(approvals.isValid({ ...input, userId: 'OTHER' }), false);
  assert.equal(approvals.consume(input), true);
  assert.equal(approvals.isValid(input), false);
  assert.throws(() => approvals.consume(input), /kedaluwarsa/);
  const expiring = approvals.issue({ userId: 'OWNER-1', purpose: 'SALE_REFUND' });
  clock += 3 * 60 * 1000 + 1;
  assert.equal(approvals.isValid({ token: expiring, userId: 'OWNER-1', purpose: 'SALE_REFUND' }), false);
});

test('CSV melindungi prefix whitespace sebelum formula', () => {
  assert.equal(csvCell('  =1+2'), "'  =1+2");
  assert.equal(csvCell('\t@SUM(1)'), "'\t@SUM(1)");
  assert.equal(csvCell('  selamat'), '  selamat');
  assert.equal(csvCell(-7), '-7');
});

test('impor Excel/CSV terlalu besar ditolak sebelum parsing', async () => {
  await assert.rejects(() => parseInventoryFile({ name: 'large.xlsx', size: 11 * 1024 * 1024 }), /melebihi 10 MB/);
});
